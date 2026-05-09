import uuid
import random
from django.db import models
from django.utils import timezone


def generate_invite_pin():
    return str(random.randint(100000, 999999))


class Tournament(models.Model):
    TOURNAMENT_TYPE_CHOICES = [
        ('solo', 'Одиночний'),
        ('team', 'Командний'),
    ]

    name        = models.CharField(max_length=255, verbose_name="Назва турніру")
    description = models.TextField(verbose_name="Опис")
    rules       = models.TextField(null=True, blank=True, verbose_name="Правила")

    image_mode   = models.CharField(max_length=50, default="stock")
    stock_image  = models.CharField(max_length=255, null=True, blank=True)
    accent_color = models.CharField(max_length=20, default="#378ADD")
    format       = models.CharField(max_length=100, null=True, blank=True)
    custom_image = models.ImageField(
        upload_to='tournaments/custom/', null=True, blank=True
    )

    # ── Тип турніру ───────────────────────────────────────────────────────────
    tournament_type = models.CharField(
        max_length=10,
        choices=TOURNAMENT_TYPE_CHOICES,
        default='solo',
        verbose_name="Тип турніру",
    )
    max_team_size = models.IntegerField(
        null=True, blank=True,
        verbose_name="Макс. учасників у команді",
    )

    # Дати
    start_date         = models.DateTimeField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end   = models.DateTimeField(null=True, blank=True)

    max_teams = models.IntegerField(null=True, blank=True)

    # Інвайти
    invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    jury_invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    jury_invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    admin_invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    admin_invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    leaderboard_published = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    def is_registration_open(self):
        now = timezone.now()
        if self.registration_start and self.registration_end:
            return self.registration_start <= now <= self.registration_end
        return False

    def get_invite_token_for_role(self, role):
        return {'participant': self.invite_token, 'jury': self.jury_invite_token, 'admin': self.admin_invite_token}.get(role)

    def get_invite_pin_for_role(self, role):
        return {'participant': self.invite_pin, 'jury': self.jury_invite_pin, 'admin': self.admin_invite_pin}.get(role)

    def set_invite_pin_for_role(self, role):
        new_pin = generate_invite_pin()
        field_map = {'participant': 'invite_pin', 'jury': 'jury_invite_pin', 'admin': 'admin_invite_pin'}
        if role in field_map:
            setattr(self, field_map[role], new_pin)
            self.save(update_fields=[field_map[role]])
        return new_pin


# ── TournamentMember ──────────────────────────────────────────────────────────

TOURNAMENT_ROLE_CHOICES = [
    ('owner', 'Власник'), ('participant', 'Учасник'),
    ('jury', 'Журі'),     ('admin', 'Адміністратор'),
]

TOKEN_FIELD_TO_ROLE = {
    'invite_token': 'participant',
    'jury_invite_token': 'jury',
    'admin_invite_token': 'admin',
}


class TournamentMember(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='members')
    user       = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='tournament_memberships')
    role       = models.CharField(max_length=20, choices=TOURNAMENT_ROLE_CHOICES, default='participant')
    joined_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user} — {self.tournament} [{self.role}]"


# ── Team ──────────────────────────────────────────────────────────────────────

class Team(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='teams')
    name       = models.CharField(max_length=255, verbose_name="Назва команди")
    captain    = models.ForeignKey(
        'users.User', on_delete=models.CASCADE,
        related_name='captained_teams', verbose_name="Капітан",
    )
    members    = models.ManyToManyField(
        'users.User', related_name='teams', blank=True, verbose_name="Учасники",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Одна команда на турнір для кожного капітана
        unique_together = ('tournament', 'captain')
        ordering = ['created_at']

    def __str__(self):
        return f"{self.name} ({self.tournament.name})"

    def can_upload(self, user):
        """Перевіряє чи може user завантажувати роботу від імені команди."""
        if self.captain == user:
            return True
        return TeamUploadPermission.objects.filter(team=self, user=user).exists()


class TeamUploadPermission(models.Model):
    """Капітан може видати право завантаження іншому учаснику команди."""
    team      = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='upload_permissions')
    user      = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='team_upload_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'user')

    def __str__(self):
        return f"{self.user} може завантажувати за {self.team.name}"


# ── Round / Task ──────────────────────────────────────────────────────────────

class Round(models.Model):
    tournament  = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="rounds")
    title       = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    start_date  = models.DateTimeField(null=True, blank=True)
    end_date    = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.tournament.name} — {self.title}"


class RoundLink(models.Model):
    round      = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="links")
    label      = models.CharField(max_length=255)
    url        = models.URLField(max_length=2048)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class RoundAttachment(models.Model):
    round      = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="rounds/attachments/")
    name       = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)


class Task(models.Model):
    round       = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="tasks")
    title       = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.round.title} — {self.title}"


class TaskLink(models.Model):
    task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="links")
    label      = models.CharField(max_length=255)
    url        = models.URLField(max_length=2048)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class TaskAttachment(models.Model):
    task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="tasks/attachments/")
    name       = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)


# ── Submission ────────────────────────────────────────────────────────────────

class Submission(models.Model):
    task        = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="submissions")
    participant = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name="submissions")
    # Для командних турнірів — до якої команди належить ця здача
    team        = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="submissions",
        verbose_name="Команда",
    )
    text         = models.TextField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        # Для командних — унікальність по task+team, для solo — task+participant
        ordering = ['-submitted_at']

    def __str__(self):
        if self.team:
            return f"{self.team.name} → {self.task.title}"
        return f"{self.participant.username} → {self.task.title}"


class SubmissionLink(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="links")
    label      = models.CharField(max_length=255, blank=True)
    url        = models.URLField(max_length=2048)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class SubmissionAttachment(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="submissions/attachments/")
    name       = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)


# ── Grade ─────────────────────────────────────────────────────────────────────

class Grade(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="grades")
    juror      = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name="grades_given")
    scores     = models.JSONField(default=dict)
    comment    = models.TextField(blank=True, default="")
    total      = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('submission', 'juror')
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.juror.username} → {self.submission} [{self.total}]"

    def recalc_total(self):
        self.total = sum(self.scores.values()) if self.scores else 0
        self.save(update_fields=['total'])
