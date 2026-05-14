from rest_framework import serializers

from ...models import Grade, JuryAssignment
from .submission import SubmissionLinkSerializer, SubmissionAttachmentSerializer


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Grade
        fields = ['id', 'submission', 'juror', 'scores', 'comment', 'total', 'created_at', 'updated_at']
        read_only_fields = ['juror', 'total', 'created_at', 'updated_at']


class GradeWriteSerializer(serializers.Serializer):
    """Серіалізатор для створення/оновлення оцінки журі."""
    scores  = serializers.DictField(child=serializers.FloatField(min_value=0))
    comment = serializers.CharField(allow_blank=True, default="")


class JuryAssignmentSerializer(serializers.ModelSerializer):
    """
    Призначення журі для конкретного подання.
    Використовується для перегляду/управління розподілом (admin/owner).
    """
    juror_username  = serializers.CharField(source='juror.username', read_only=True)
    juror_full_name = serializers.SerializerMethodField()
    submission_info = serializers.SerializerMethodField()

    class Meta:
        model  = JuryAssignment
        fields = [
            'id',
            'tournament', 'juror', 'juror_username', 'juror_full_name',
            'submission', 'submission_info',
            'assigned_at',
        ]
        read_only_fields = ['tournament', 'assigned_at']

    def get_juror_full_name(self, obj):
        u = obj.juror
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_submission_info(self, obj):
        sub = obj.submission
        return {
            'id':          sub.id,
            'task_title':  sub.task.title,
            'round_title': sub.task.round.title,
            'author': (
                f"{sub.participant.first_name} {sub.participant.last_name}".strip()
                or sub.participant.username
            ),
        }


class JurySubmissionSerializer(serializers.ModelSerializer):
    """
    Подання для журі — без особистих даних учасника (анонімізовано).
    Містить my_grade поточного журі та кількість призначених рецензентів.
    """
    task_title  = serializers.CharField(source='task.title',       read_only=True)
    round_id    = serializers.IntegerField(source='task.round.id', read_only=True)
    round_title = serializers.CharField(source='task.round.title', read_only=True)

    author_name   = serializers.SerializerMethodField()
    content_text  = serializers.CharField(source='text', read_only=True)
    content_links = SubmissionLinkSerializer(source='links', many=True, read_only=True)
    content_files = SubmissionAttachmentSerializer(source='attachments', many=True, read_only=True)

    my_grade         = serializers.SerializerMethodField()
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model  = Grade.__class__  # Submission
        fields = [
            'id',
            'task_title', 'round_id', 'round_title',
            'author_name',
            'content_text', 'content_links', 'content_files',
            'submitted_at',
            'my_grade',
            'assignment_count',
        ]

    def get_author_name(self, obj):
        user = obj.participant
        if not user:
            return "Ім'я не вказано"
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name or user.username or f"Учасник #{user.id}"

    def get_my_grade(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        grade = obj.grades.filter(juror=request.user).first()
        if not grade:
            return None
        return {
            'id':         grade.id,
            'scores':     grade.scores,
            'comment':    grade.comment,
            'total':      grade.total,
            'updated_at': grade.updated_at,
        }

    def get_assignment_count(self, obj):
        return obj.jury_assignments.count()
