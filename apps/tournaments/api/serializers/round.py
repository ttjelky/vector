from rest_framework import serializers

from ...models import Round, RoundLink, RoundAttachment
from .mixins import TechRequirementsMixin
from .task import TaskSerializer


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


class RoundSerializer(TechRequirementsMixin, serializers.ModelSerializer):
    tasks             = TaskSerializer(many=True, read_only=True)
    links             = RoundLinkSerializer(many=True, read_only=True)
    attachments       = RoundAttachmentSerializer(many=True, read_only=True)
    tech_requirements = serializers.JSONField(required=False, allow_null=True)
    must_have         = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model  = Round
        fields = [
            'id', 'tournament', 'title', 'description',
            'tech_requirements', 'must_have',
            'start_date', 'end_date', 'created_at',
            'tasks', 'links', 'attachments',
        ]
        read_only_fields = ['tournament', 'created_at']
