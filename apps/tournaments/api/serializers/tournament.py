from rest_framework import serializers

from ...models import Tournament, TournamentMember


class TournamentSerializer(serializers.ModelSerializer):
    custom_image = serializers.ImageField(
        use_url=True,
        required=False,
        allow_null=True,
    )
    invite_token = serializers.UUIDField(read_only=True)

    class Meta:
        model  = Tournament
        fields = '__all__'


class TournamentMemberSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source='user.username',   read_only=True)
    email      = serializers.EmailField(source='user.email',     read_only=True)
    user_role  = serializers.CharField(source='user.role',       read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name  = serializers.CharField(source='user.last_name',  read_only=True)
    avatar     = serializers.SerializerMethodField()

    class Meta:
        model  = TournamentMember
        fields = [
            'id', 'user', 'username', 'email', 'user_role',
            'role', 'joined_at', 'first_name', 'last_name', 'avatar',
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


class JoinByTokenSerializer(serializers.Serializer):
    token = serializers.UUIDField()
