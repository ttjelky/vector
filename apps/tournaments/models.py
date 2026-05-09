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
    end_date           = models.DateTimeField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end   = models.DateTimeField(null=True, blank=True)

    # Числові значення
    max_teams     = models.IntegerField(null=True, blank=True)
    min_team_size = models.IntegerField(null=True, blank=True)
    max_team_size = models.IntegerField(null=True, blank=True)

    # ── Інвайт для учасників ──────────────────────────────────────────────────
    invite_token = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
        verbose_name="Інвайт-токен (учасник)",
    )
    invite_pin = models.CharField(
        max_length=6, default=generate_invite_pin,
        verbose_name="PIN-код (учасник)",
    )

    # ── Інвайт для журі ───────────────────────────────────────────────────────
    jury_invite_token = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
        verbose_name="Інвайт-токен (журі)",
    )
    jury_invite_pin = models.CharField(
        max_length=6, default=generate_invite_pin,
        verbose_name="PIN-код (журі)",
    )

    # ── Інвайт для адмінів ────────────────────────────────────────────────────
    admin_invite_token = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
        verbose_name="Інвайт-токен (адмін)",
    )
    admin_invite_pin = models.CharField(
        max_length=6, default=generate_invite_pin,
        verbose_name="PIN-код (адмін)",
    )

    # ── Таблиця лідерів ───────────────────────────────────────────────────────
    leaderboard_published = models.BooleanField(
        default=False,
        verbose_name="Таблиця лідерів опублікована",
    )

    # ── Тимчасовий виняток реєстрації ────────────────────────────────────────
    registration_exception_until = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Реєстрація відкрита до (виняток)",
    )

    def registration_open(self):
        """
        True якщо зараз дозволена реєстрація учасників:
          — або статус турніру 'registration'
          — або активний тимчасовий виняток адміна
        """
        from django.utils import timezone
        now = timezone.now()
        # Звичайна реєстрація
        start = self.start_date
        reg_end = self.registration_end
        if start and now >= start and (not reg_end or now <= reg_end):
            return True
        # Тимчасовий виняток
        if self.registration_exception_until and now < self.registration_exception_until:
            return True
        return False

    def __str__(self):
        return self.name

    def get_invite_token_for_role(self, role):
        mapping = {
            'participant': self.invite_token,
            'jury':        self.jury_invite_token,
            'admin':       self.admin_invite_token,
        }
        return mapping.get(role)

    def get_invite_pin_for_role(self, role):
        mapping = {
            'participant': self.invite_pin,
            'jury':        self.jury_invite_pin,
            'admin':       self.admin_invite_pin,
        }
        return mapping.get(role)

    def set_invite_pin_for_role(self, role):
        """Перегенерує PIN для вказаної ролі, повертає новий PIN."""
        new_pin = generate_invite_pin()
        if role == 'participant':
            self.invite_pin = new_pin
            self.save(update_fields=['invite_pin'])
        elif role == 'jury':
            self.jury_invite_pin = new_pin
            self.save(update_fields=['jury_invite_pin'])
        elif role == 'admin':
            self.admin_invite_pin = new_pin
            self.save(update_fields=['admin_invite_pin'])
        return new_pin


# ── TournamentMember ──────────────────────────────────────────────────────────

TOURNAMENT_ROLE_CHOICES = [
    ('owner',       'Власник'),
    ('participant', 'Учасник'),
    ('jury',        'Журі'),
    ('admin',       'Адміністратор'),
]

# Токен → роль при приєднанні (використовується у view)
TOKEN_FIELD_TO_ROLE = {
    'invite_token':       'participant',
    'jury_invite_token':  'jury',
    'admin_invite_token': 'admin',
}


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
    tournament         = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="rounds")
    title              = models.CharField(max_length=255, verbose_name="Назва")
    description        = models.TextField(null=True, blank=True, verbose_name="Опис")
    start_date         = models.DateTimeField(null=True, blank=True, verbose_name="Початок")
    end_date           = models.DateTimeField(null=True, blank=True, verbose_name="Кінець")
    tech_requirements  = models.JSONField(
        null=True, blank=True,
        verbose_name="Вимоги до технологій",
        help_text="Список об'єктів [{category, value}]",
    )
    must_have          = models.JSONField(
        null=True, blank=True,
        verbose_name="Must have — обов'язкові критерії",
        help_text="Список рядків [\"вимога 1\", \"вимога 2\"]",
    )
    created_at         = models.DateTimeField(auto_now_add=True)

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
    round              = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="tasks")
    title              = models.CharField(max_length=255, verbose_name="Назва завдання")
    description        = models.TextField(null=True, blank=True, verbose_name="Опис завдання")
    tech_requirements  = models.JSONField(null=True, blank=True, verbose_name="Вимоги до технологій")
    must_have          = models.JSONField(null=True, blank=True, verbose_name="Must have")
    created_at         = models.DateTimeField(auto_now_add=True)

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
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="submissions", verbose_name="Завдання",
    )
    participant = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name="submissions", verbose_name="Учасник",
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


# ── Grade ─────────────────────────────────────────────────────────────────────

class Grade(models.Model):
    """
    Оцінка журі для конкретного подання.
    Одне журі — одна оцінка на одне подання (unique_together).
    Бали зберігаються як JSON-словник: { "originality": 8, "execution": 7, ... }
    """
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        related_name="grades",
        verbose_name="Подання",
    )
    juror = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name="grades_given",
        verbose_name="Журі",
    )
    scores  = models.JSONField(default=dict, verbose_name="Бали за критеріями")
    comment = models.TextField(blank=True, default="", verbose_name="Коментар")
    total   = models.FloatField(default=0, verbose_name="Загальний бал")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата оцінювання")
    updated_at = models.DateTimeField(auto_now=True,     verbose_name="Дата оновлення")

    class Meta:
        unique_together = ('submission', 'juror')
        ordering = ['-updated_at']
        verbose_name = "Оцінка"
        verbose_name_plural = "Оцінки"

    def __str__(self):
        return f"{self.juror.username} → {self.submission} [{self.total}]"

    def recalc_total(self):
        """Перераховує та зберігає загальний бал."""
        self.total = sum(self.scores.values()) if self.scores else 0
        self.save(update_fields=['total'])
