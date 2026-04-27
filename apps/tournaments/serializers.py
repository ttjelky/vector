from rest_framework import serializers
from .models import Tournament, TournamentMember, Round, RoundLink, RoundAttachment, Task, TaskLink, TaskAttachment


class TournamentSerializer(serializers.ModelSerializer):
    custom_image = serializers.ImageField(
        use_url=True,
        required=False,
        allow_null=True,
    )
    # Тільки для читання — повертає invite_token щоб фронт міг будувати посилання
    invite_token = serializers.UUIDField(read_only=True)

    class Meta:
        model  = Tournament
        fields = '__all__'


# ── TournamentMember serializers ──────────────────────────────────────────────

class TournamentMemberSerializer(serializers.ModelSerializer):
    """Серіалайзер для відображення учасників турніру."""
    username   = serializers.CharField(source='user.username', read_only=True)
    email      = serializers.EmailField(source='user.email', read_only=True)
    user_role  = serializers.CharField(source='user.role', read_only=True)  # глобальна роль (admin/team/jury)

    class Meta:
        model  = TournamentMember
        fields = ['id', 'user', 'username', 'email', 'user_role', 'role', 'joined_at']
        read_only_fields = ['joined_at']


class JoinByTokenSerializer(serializers.Serializer):
    """Серіалайзер для приєднання до турніру за токеном."""
    token = serializers.UUIDField()


# ── Task serializers ──────────────────────────────────────────────────────────

class TaskLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TaskLink
        fields = ['id', 'label', 'url']


class TaskAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=True)

    class Meta:
        model  = TaskAttachment
        fields = ['id', 'file', 'name', 'created_at']
        read_only_fields = ['name', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    links       = TaskLinkSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model  = Task
        fields = ['id', 'round', 'title', 'description', 'created_at', 'links', 'attachments']
        read_only_fields = ['round', 'created_at']


# ── Round serializers ─────────────────────────────────────────────────────────

class RoundLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RoundLink
        fields = ['id', 'label', 'url']


class RoundAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=True)

    class Meta:
        model  = RoundAttachment
        fields = ['id', 'file', 'name', 'created_at']
        read_only_fields = ['name', 'created_at']


class RoundSerializer(serializers.ModelSerializer):
    tasks       = TaskSerializer(many=True, read_only=True)
    links       = RoundLinkSerializer(many=True, read_only=True)
    attachments = RoundAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model  = Round
        fields = [
            'id', 'tournament', 'title', 'description',
            'start_date', 'end_date', 'created_at',
            'tasks', 'links', 'attachments',
        ]
        read_only_fields = ['tournament', 'created_at']
