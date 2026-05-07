from rest_framework import serializers
from .models import (
    Tournament, TournamentMember,
    Round, RoundLink, RoundAttachment,
    Task, TaskLink, TaskAttachment,
    Submission, SubmissionLink, SubmissionAttachment,
    Grade,
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
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name  = serializers.CharField(source='user.last_name',  read_only=True)

    class Meta:
        model  = TournamentMember
        fields = ['id', 'user', 'username', 'email', 'user_role', 'role', 'joined_at', 'first_name', 'last_name']
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


# ── Grade serializers ─────────────────────────────────────────────────────────

class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Grade
        fields = ['id', 'submission', 'juror', 'scores', 'comment', 'total', 'created_at', 'updated_at']
        read_only_fields = ['juror', 'total', 'created_at', 'updated_at']


class GradeWriteSerializer(serializers.Serializer):
    """Серіалізатор для створення/оновлення оцінки журі."""
    scores  = serializers.DictField(child=serializers.FloatField(min_value=0))
    comment = serializers.CharField(allow_blank=True, default="")


# ── Jury panel serializers ────────────────────────────────────────────────────

class JurySubmissionSerializer(serializers.ModelSerializer):
    """
    Подання для журі — без особистих даних учасника (анонімізовано).
    Містить my_grade поточного журі.
    """
    task_title  = serializers.CharField(source='task.title',        read_only=True)
    round_id    = serializers.IntegerField(source='task.round.id',  read_only=True)
    round_title = serializers.CharField(source='task.round.title',  read_only=True)

    # Ім'я автора — full_name якщо є, інакше username
    author_name = serializers.SerializerMethodField()

    # Контент для перегляду
    content_text  = serializers.CharField(source='text', read_only=True)
    content_links = SubmissionLinkSerializer(source='links', many=True, read_only=True)
    content_files = SubmissionAttachmentSerializer(source='attachments', many=True, read_only=True)

    # Оцінка поточного журі
    my_grade = serializers.SerializerMethodField()

    class Meta:
        model  = Submission
        fields = [
            'id',
            'task_title', 'round_id', 'round_title',
            'author_name',
            'content_text', 'content_links', 'content_files',
            'submitted_at',
            'my_grade',
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
