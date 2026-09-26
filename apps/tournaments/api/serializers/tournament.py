from rest_framework import serializers

from ...models import Tournament, TournamentMember


class TournamentSerializer(serializers.ModelSerializer):
    custom_image = serializers.ImageField(
        use_url=True,
        required=False,
        allow_null=True,
    )
    invite_token = serializers.UUIDField(read_only=True)
    registration_open = serializers.SerializerMethodField()
    registration_reason = serializers.SerializerMethodField()
    registration_message = serializers.SerializerMethodField()

    class Meta:
        model  = Tournament
        fields = '__all__'

    def get_registration_open(self, obj):
        return obj.registration_open()

    def get_registration_reason(self, obj):
        _, reason, _ = obj.registration_status()
        return reason

    def get_registration_message(self, obj):
        _, _, message = obj.registration_status()
        return message


class TournamentMemberSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source='user.username',   read_only=True)
    email      = serializers.EmailField(source='user.email',     read_only=True)
    user_role  = serializers.CharField(source='user.role',       read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name  = serializers.CharField(source='user.last_name',  read_only=True)
    avatar     = serializers.SerializerMethodField()
    registration_answers = serializers.SerializerMethodField()
    registration_display = serializers.SerializerMethodField()

    class Meta:
        model  = TournamentMember
        fields = [
            'id', 'user', 'username', 'email', 'user_role',
            'role', 'joined_at', 'first_name', 'last_name', 'avatar',
            'registration_answers', 'registration_display',
        ]
        read_only_fields = ['joined_at']

    def get_avatar(self, obj):
        try:
            profile = obj.user.profile
            if profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.avatar.url)
                return f"http://127.0.0.1:8000{profile.avatar.url}"
        except Exception:
            pass
        return None

    def _get_response(self, obj):
        if not hasattr(obj, '_reg_response_cache'):
            from ...models import RegistrationResponse
            try:
                obj._reg_response_cache = RegistrationResponse.objects.get(
                    tournament_id=obj.tournament_id, user_id=obj.user_id
                )
            except RegistrationResponse.DoesNotExist:
                obj._reg_response_cache = None
        return obj._reg_response_cache

    def get_registration_answers(self, obj):
        resp = self._get_response(obj)
        return resp.answers if resp else {}

    def get_registration_display(self, obj):
        resp = self._get_response(obj)
        if not resp:
            return []
        from ...models import RegistrationField
        fields = {f.id: f for f in RegistrationField.objects.filter(tournament_id=obj.tournament_id)}
        out = []
        for fid, val in (resp.answers or {}).items():
            try:
                fid_int = int(fid)
            except (ValueError, TypeError):
                continue
            field = fields.get(fid_int)
            if not field:
                continue
            if isinstance(val, list):
                value = ", ".join(str(v) for v in val)
            else:
                value = str(val) if val is not None else ""
            out.append({"field_id": fid_int, "label": field.label, "value": value})
        return out


class JoinByTokenSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    answers = serializers.DictField(required=False, default=dict)
