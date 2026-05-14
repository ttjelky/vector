from rest_framework import serializers

from ...models import Submission, SubmissionLink, SubmissionAttachment


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

    participant_id       = serializers.IntegerField(source='participant.id',      read_only=True)
    participant_username = serializers.CharField(source='participant.username',   read_only=True)
    participant_email    = serializers.EmailField(source='participant.email',     read_only=True)

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
