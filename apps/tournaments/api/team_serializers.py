# tournaments/team_serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model

from ..models import Team, TeamMember, Tournament

User = get_user_model()


# ── User (compact) ────────────────────────────────────────────────────────────

class UserCompactSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    avatar    = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'email', 'username', 'full_name', 'avatar']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_avatar(self, obj):
        try:
            profile = obj.profile
            if profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return profile.avatar.url
        except Exception:
            pass
        return None


# ── TeamMember (read) ─────────────────────────────────────────────────────────

class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserCompactSerializer(read_only=True)

    class Meta:
        model  = TeamMember
        fields = ['id', 'user', 'status', 'added_at']
        read_only_fields = ['status', 'added_at']


# ── Team (read) ───────────────────────────────────────────────────────────────

class TeamSerializer(serializers.ModelSerializer):
    captain        = UserCompactSerializer(read_only=True)
    members        = TeamMemberSerializer(many=True, read_only=True)
    member_count   = serializers.SerializerMethodField()
    can_register   = serializers.SerializerMethodField()
    is_editable    = serializers.SerializerMethodField()
    registration_status = serializers.SerializerMethodField()

    class Meta:
        model  = Team
        fields = [
            'id', 'tournament',
            'name', 'city', 'contact',
            'captain',
            'status', 'roster_locked',
            'team_invite_token',
            'members', 'member_count',
            'can_register', 'is_editable',
            'registration_status',
            'created_at',
        ]
        read_only_fields = [
            'tournament', 'captain', 'status',
            'roster_locked', 'team_invite_token', 'created_at',
        ]

    def get_member_count(self, obj):
        return obj.total_participant_count()

    def get_can_register(self, obj):
        return obj.can_register()

    def get_is_editable(self, obj):
        return obj.is_roster_editable()

    def get_registration_status(self, obj):
        from django.utils import timezone
        t = obj.tournament
        now = timezone.now()
        if t.registration_end and now > t.registration_end:
            return 'closed'
        if t.registration_start and now < t.registration_start:
            return 'not_started'
        return 'open'


# ── Team (create) ─────────────────────────────────────────────────────────────

class TeamCreateSerializer(serializers.Serializer):
    name    = serializers.CharField(max_length=200)
    city    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    contact = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate(self, data):
        tournament = self.context['tournament']
        captain    = self.context['captain']

        if tournament.tournament_type != 'team':
            raise serializers.ValidationError("Це не командний турнір.")

        if not tournament.registration_open():
            raise serializers.ValidationError("Реєстрація команд наразі закрита.")

        if Team.objects.filter(tournament=tournament, captain=captain).exists():
            raise serializers.ValidationError("Ви вже є капітаном команди у цьому турнірі.")

        if TeamMember.objects.filter(
            team__tournament=tournament,
            user=captain,
            status=TeamMember.STATUS_ACCEPTED,
        ).exists():
            raise serializers.ValidationError("Ви вже є учасником іншої команди у цьому турнірі.")

        if tournament.max_teams:
            if Team.objects.filter(
                tournament=tournament, status=Team.STATUS_REGISTERED
            ).count() >= tournament.max_teams:
                raise serializers.ValidationError("Досягнуто максимальну кількість команд у турнірі.")

        return data

    def create(self, validated_data):
        tournament = self.context['tournament']
        captain    = self.context['captain']
        return Team.objects.create(
            tournament=tournament,
            captain=captain,
            status=Team.STATUS_DRAFT,
            **validated_data,
        )


# ── Team (update) ─────────────────────────────────────────────────────────────

class TeamUpdateSerializer(serializers.Serializer):
    name    = serializers.CharField(max_length=200, required=False)
    city    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    contact = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate(self, data):
        team = self.context['team']
        if not team.is_roster_editable():
            raise serializers.ValidationError("Команда вже зареєстрована або склад зафіксований.")
        return data

    def update(self, instance: Team, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ── Invite member ─────────────────────────────────────────────────────────────

class TeamInviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()

    def validate(self, data):
        team    = self.context['team']
        captain = self.context['captain']
        email   = data['email']

        if not team.is_roster_editable():
            raise serializers.ValidationError("Команда вже зареєстрована або склад зафіксований.")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Користувача з таким email не знайдено. Учасник має бути зареєстрований на сайті."
            )

        if user == captain:
            raise serializers.ValidationError("Капітан не може запросити себе як учасника.")

        if TeamMember.objects.filter(team=team, user=user).exists():
            raise serializers.ValidationError("Цей користувач вже запрошений або є учасником команди.")

        if TeamMember.objects.filter(
            team__tournament=team.tournament,
            user=user,
            status=TeamMember.STATUS_ACCEPTED,
        ).exists():
            raise serializers.ValidationError("Цей користувач вже є учасником іншої команди у цьому турнірі.")

        t = team.tournament
        if t.max_team_size:
            current = team.members.count() + 1
            if current >= t.max_team_size:
                raise serializers.ValidationError(f"Команда вже заповнена (макс. {t.max_team_size} учасників).")

        data['user'] = user
        return data

    def save(self):
        team = self.context['team']
        user = self.validated_data['user']
        return TeamMember.objects.create(
            team=team,
            user=user,
            status=TeamMember.STATUS_PENDING,
        )


# ── Admin serializer ──────────────────────────────────────────────────────────

class TeamAdminSerializer(serializers.ModelSerializer):
    captain       = UserCompactSerializer(read_only=True)
    members       = serializers.SerializerMethodField()
    member_count  = serializers.SerializerMethodField()
    is_editable   = serializers.SerializerMethodField()
    captain_name  = serializers.SerializerMethodField()
    captain_email = serializers.SerializerMethodField()

    class Meta:
        model  = Team
        fields = [
            'id', 'name', 'captain', 'captain_name', 'captain_email',
            'city', 'contact',
            'status', 'roster_locked',
            'members', 'member_count', 'is_editable',
            'created_at',
        ]

    def get_member_count(self, obj):
        return obj.total_participant_count()

    def get_is_editable(self, obj):
        return obj.is_roster_editable()

    def get_captain_name(self, obj):
        return f"{obj.captain.first_name} {obj.captain.last_name}".strip() or obj.captain.username

    def get_captain_email(self, obj):
        return obj.captain.email

    def get_members(self, obj):
        request = self.context.get('request')
        result = []
        for m in obj.members.select_related('user__profile').all():
            avatar = None
            try:
                if m.user.profile.avatar:
                    avatar = request.build_absolute_uri(m.user.profile.avatar.url) if request else m.user.profile.avatar.url
            except Exception:
                pass
            result.append({
                'id':        m.id,
                'full_name': f"{m.user.first_name} {m.user.last_name}".strip() or m.user.username,
                'email':     m.user.email,
                'status':    m.status,
                'avatar':    avatar,
            })
        return result