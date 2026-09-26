from rest_framework import serializers
from ...models import TournamentInviteLink


class TournamentInviteLinkSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()

    class Meta:
        model = TournamentInviteLink
        fields = ['id', 'tournament', 'role', 'token', 'name', 'created_at', 'invite_url']
        read_only_fields = ['id', 'tournament', 'token', 'created_at', 'invite_url']

    def get_invite_url(self, obj):
        # BASE_URL захардкоджено в views; тут відносний шлях — фронт добудує
        return str(obj.token)
