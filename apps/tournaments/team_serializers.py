# tournaments/team_serializers.py
# ─────────────────────────────────────────────────────────────────────────────
# Serializers для нового флоу: чернетка → запрошення учасників → реєстрація.
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Team, TeamMember, Tournament

User = get_user_model()


# ── User (compact) ────────────────────────────────────────────────────────────

class UserCompactSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'email', 'username', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


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


# ── Team (create — крок 1: чернетка) ─────────────────────────────────────────

class TeamCreateSerializer(serializers.Serializer):
    """
    Капітан заповнює тільки назву, місто (опц.) і контакт (опц.).
    Команда одразу отримує статус 'draft'.
    """
    name    = serializers.CharField(max_length=200)
    city    = serializers.CharField(max_length=100, required=False, allow_blank=True)
    contact = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate(self, data):
        tournament: Tournament = self.context['tournament']
        captain: User          = self.context['captain']

        # Турнір командний
        if tournament.tournament_type != 'team':
            raise serializers.ValidationError("Це не командний турнір.")

        # Реєстрація відкрита
        if not tournament.registration_open():
            raise serializers.ValidationError(
                "Реєстрація команд наразі закрита."
            )

        # Капітан вже в якійсь команді цього турніру
        if Team.objects.filter(tournament=tournament, captain=captain).exists():
            raise serializers.ValidationError(
                "Ви вже є капітаном команди у цьому турнірі."
            )

        # Капітан вже прийнятий як учасник іншої команди
        if TeamMember.objects.filter(
            team__tournament=tournament,
            user=captain,
            status=TeamMember.STATUS_ACCEPTED,
        ).exists():
            raise serializers.ValidationError(
                "Ви вже є учасником іншої команди у цьому турнірі."
            )

        # Ліміт команд
        if tournament.max_teams:
            if Team.objects.filter(
                tournament=tournament, status=Team.STATUS_REGISTERED
            ).count() >= tournament.max_teams:
                raise serializers.ValidationError(
                    "Досягнуто максимальну кількість команд у турнірі."
                )

        return data

    def create(self, validated_data):
        tournament: Tournament = self.context['tournament']
        captain: User          = self.context['captain']
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
        team: Team = self.context['team']
        if not team.is_roster_editable():
            raise serializers.ValidationError(
                "Команда вже зареєстрована або склад зафіксований."
            )
        return data

    def update(self, instance: Team, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


# ── Invite member ─────────────────────────────────────────────────────────────

class TeamInviteMemberSerializer(serializers.Serializer):
    """
    Капітан запрошує учасника за email.
    Шукаємо зареєстрованого юзера — не email-рядок.
    """
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower().strip()

    def validate(self, data):
        team: Team    = self.context['team']
        captain: User = self.context['captain']
        email         = data['email']

        if not team.is_roster_editable():
            raise serializers.ValidationError(
                "Команда вже зареєстрована або склад зафіксований."
            )

        # Знаходимо юзера
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Користувача з таким email не знайдено. "
                "Учасник має бути зареєстрований на сайті."
            )

        # Капітан не може запросити себе
        if user == captain:
            raise serializers.ValidationError(
                "Капітан не може запросити себе як учасника."
            )

        # Вже є у цій команді
        if TeamMember.objects.filter(team=team, user=user).exists():
            raise serializers.ValidationError(
                "Цей користувач вже запрошений або є учасником команди."
            )

        # Вже прийнятий учасник іншої команди у цьому турнірі
        if TeamMember.objects.filter(
            team__tournament=team.tournament,
            user=user,
            status=TeamMember.STATUS_ACCEPTED,
        ).exists():
            raise serializers.ValidationError(
                "Цей користувач вже є учасником іншої команди у цьому турнірі."
            )

        # Перевірка максимального розміру (рахуємо accepted + pending, щоб не спамити)
        t = team.tournament
        if t.max_team_size:
            current = team.members.count() + 1  # +1 captain
            if current >= t.max_team_size:
                raise serializers.ValidationError(
                    f"Команда вже заповнена (макс. {t.max_team_size} учасників)."
                )

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
    captain      = UserCompactSerializer(read_only=True)
    members      = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    is_editable  = serializers.SerializerMethodField()
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
        return [
            {
                'id':        m.id,
                'full_name': f"{m.user.first_name} {m.user.last_name}".strip() or m.user.username,
                'email':     m.user.email,
                'status':    m.status,
            }
            for m in obj.members.all()
        ]
