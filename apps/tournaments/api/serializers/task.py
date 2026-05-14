from rest_framework import serializers

from ...models import Task, TaskLink, TaskAttachment
from .mixins import TechRequirementsMixin


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


class TaskSerializer(TechRequirementsMixin, serializers.ModelSerializer):
    links             = TaskLinkSerializer(many=True, read_only=True)
    attachments       = TaskAttachmentSerializer(many=True, read_only=True)
    tech_requirements = serializers.JSONField(required=False, allow_null=True)
    must_have         = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model  = Task
        fields = [
            'id', 'round', 'title', 'description',
            'tech_requirements', 'must_have',
            'created_at', 'links', 'attachments',
        ]
        read_only_fields = ['round', 'created_at']
