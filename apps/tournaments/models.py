import uuid
import random
from django.db import models


def generate_invite_pin():
    """Генерує випадковий 6-значний PIN для запрошення."""
    return str(random.randint(100000, 999999))


class Tournament(models.Model):
    # Текстові поля
    name        = models.CharField(max_length=255, verbose_name="Назва турніру")
    description = models.TextField(verbose_name="Опис")
    rules       = models.TextField(null=True, blank=True, verbose_name="Правила")

    # Поля вибору та налаштувань
    image_mode   = models.CharField(max_length=50, default="stock")
    stock_image  = models.CharField(max_length=255, null=True, blank=True)
    accent_color = models.CharField(max_length=20, default="#378ADD")
    format       = models.CharField(max_length=100, null=True, blank=True)
    custom_image = models.ImageField(
        upload_to='tournaments/custom/', null=True, blank=True, verbose_name="Власна обкладинка"
    )

    # Дати
    start_date         = models.DateTimeField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end   = models.DateTimeField(null=True, blank=True)

    # Числові значення
    max_teams = models.IntegerField(null=True, blank=True)

    # ── Інвайт-токен ──────────────────────────────────────────────────────────
    invite_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name="Інвайт-токен",
    )

    # ── PIN-код для додаткової перевірки при приєднанні ───────────────────────
    invite_pin = models.CharField(
        max_length=6,
        default=generate_invite_pin,
        verbose_name="PIN-код запрошення",
    )

    def __str__(self):
        return self.name


# ── TournamentMember ──────────────────────────────────────────────────────────

TOURNAMENT_ROLE_CHOICES = [
    ('owner',       'Власник'),
    ('participant', 'Учасник'),
]


class TournamentMember(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name="Турнір",
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='tournament_memberships',
        verbose_name="Користувач",
    )
    role = models.CharField(
        max_length=20,
        choices=TOURNAMENT_ROLE_CHOICES,
        default='participant',
        verbose_name="Роль",
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата приєднання")

    class Meta:
        unique_together = ('tournament', 'user')
        ordering = ['joined_at']
        verbose_name = "Учасник турніру"
        verbose_name_plural = "Учасники турніру"

    def __str__(self):
        return f"{self.user} — {self.tournament} [{self.role}]"


# ── Round ─────────────────────────────────────────────────────────────────────

class Round(models.Model):
    tournament  = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="rounds")
    title       = models.CharField(max_length=255, verbose_name="Назва")
    description = models.TextField(null=True, blank=True, verbose_name="Опис")
    start_date  = models.DateTimeField(null=True, blank=True, verbose_name="Початок")
    end_date    = models.DateTimeField(null=True, blank=True, verbose_name="Кінець")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.tournament.name} — {self.title}"


class RoundLink(models.Model):
    round = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="links")
    label = models.CharField(max_length=255, verbose_name="Підпис посилання")
    url   = models.URLField(max_length=2048, verbose_name="URL")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.round.title} — {self.label}"


class RoundAttachment(models.Model):
    round      = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="rounds/attachments/", verbose_name="Файл")
    name       = models.CharField(max_length=255, verbose_name="Назва файлу", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.round.title} — {self.name}"


class Task(models.Model):
    round       = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="tasks")
    title       = models.CharField(max_length=255, verbose_name="Назва завдання")
    description = models.TextField(null=True, blank=True, verbose_name="Опис завдання")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.round.title} — {self.title}"


class TaskLink(models.Model):
    task  = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="links")
    label = models.CharField(max_length=255, verbose_name="Підпис")
    url   = models.URLField(max_length=2048, verbose_name="URL")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class TaskAttachment(models.Model):
    task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="tasks/attachments/", verbose_name="Файл")
    name       = models.CharField(max_length=255, verbose_name="Назва файлу", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)


# ── Submission ────────────────────────────────────────────────────────────────

class Submission(models.Model):
    """Здача роботи учасником по конкретному завданню."""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="submissions",
        verbose_name="Завдання",
    )
    participant = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name="submissions",
        verbose_name="Учасник",
    )
    text         = models.TextField(null=True, blank=True, verbose_name="Текст відповіді")
    submitted_at = models.DateTimeField(auto_now_add=True, verbose_name="Час здачі")
    updated_at   = models.DateTimeField(auto_now=True,     verbose_name="Час оновлення")

    class Meta:
        unique_together = ('task', 'participant')
        ordering = ['-submitted_at']
        verbose_name = "Здача роботи"
        verbose_name_plural = "Здачі робіт"

    def __str__(self):
        return f"{self.participant.username} → {self.task.title}"


class SubmissionLink(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="links")
    label      = models.CharField(max_length=255, blank=True, verbose_name="Підпис")
    url        = models.URLField(max_length=2048, verbose_name="URL")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.submission} — {self.label or self.url}"


class SubmissionAttachment(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="submissions/attachments/", verbose_name="Файл")
    name       = models.CharField(max_length=255, blank=True, verbose_name="Назва файлу")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.submission} — {self.name}"
