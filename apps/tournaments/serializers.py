from rest_framework import serializers
from .models import (
    Tournament, TournamentMember,
    Round, RoundLink, RoundAttachment,
    Task, TaskLink, TaskAttachment,
    Submission, SubmissionLink, SubmissionAttachment,
)


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


# ── TournamentMember serializers ──────────────────────────────────────────────

class TournamentMemberSerializer(serializers.ModelSerializer):
    username   = serializers.CharField(source='user.username', read_only=True)
    email      = serializers.EmailField(source='user.email',   read_only=True)
    user_role  = serializers.CharField(source='user.role',     read_only=True)

    class Meta:
        model  = TournamentMember
        fields = ['id', 'user', 'username', 'email', 'user_role', 'role', 'joined_at']
        read_only_fields = ['joined_at']


class JoinByTokenSerializer(serializers.Serializer):
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


# ── Submission serializers ────────────────────────────────────────────────────

class SubmissionLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SubmissionLink
        fields = ['id', 'label', 'url']


class SubmissionAttachmentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=True)

    class Meta:
        model  = SubmissionAttachment
        fields = ['id', 'file', 'name', 'created_at']
        read_only_fields = ['name', 'created_at']


class SubmissionSerializer(serializers.ModelSerializer):
    links       = SubmissionLinkSerializer(many=True, read_only=True)
    attachments = SubmissionAttachmentSerializer(many=True, read_only=True)

    participant_id       = serializers.IntegerField(source='participant.id',       read_only=True)
    participant_username = serializers.CharField(source='participant.username',    read_only=True)
    participant_email    = serializers.EmailField(source='participant.email',      read_only=True)

    class Meta:
        model  = Submission
        fields = [
            'id', 'task',
            'participant_id', 'participant_username', 'participant_email',
            'text',
            'submitted_at', 'updated_at',
            'links', 'attachments',
        ]
        read_only_fields = ['task', 'submitted_at', 'updated_at']
