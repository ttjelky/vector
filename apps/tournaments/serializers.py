from rest_framework import serializers
from .models import Tournament, Round, RoundLink, RoundAttachment, Task, TaskLink, TaskAttachment


class TournamentSerializer(serializers.ModelSerializer):
    custom_image = serializers.ImageField(
        use_url=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model  = Tournament
        fields = '__all__'


# ─── Task serializers ──────────────────────────────────────────────────────────

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


# ─── Round serializers ─────────────────────────────────────────────────────────

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
