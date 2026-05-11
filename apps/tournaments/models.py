import uuid
import random
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


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

    # Дати
    start_date         = models.DateTimeField(null=True, blank=True)
    end_date           = models.DateTimeField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end   = models.DateTimeField(null=True, blank=True)

    # Числові значення
    max_teams     = models.IntegerField(null=True, blank=True)
    min_team_size = models.IntegerField(null=True, blank=True)
    max_team_size = models.IntegerField(null=True, blank=True)

    # Інвайти
    invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    jury_invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    jury_invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    admin_invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    admin_invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    leaderboard_published = models.BooleanField(default=False)

    # ── Тимчасовий виняток реєстрації ────────────────────────────────────────
    registration_exception_until = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Реєстрація відкрита до (виняток)",
    )

    def registration_open(self):
        from django.utils import timezone
        now = timezone.now()
        start = self.start_date
        reg_end = self.registration_end
        if start and now >= start and (not reg_end or now <= reg_end):
            return True
        if self.registration_exception_until and now < self.registration_exception_until:
            return True
        return False

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
    STATUS_DRAFT      = 'draft'
    STATUS_REGISTERED = 'registered'
    STATUS_CHOICES = [
        (STATUS_DRAFT,      'Чернетка'),
        (STATUS_REGISTERED, 'Зареєстрована'),
    ]

    tournament = models.ForeignKey(
        'Tournament', on_delete=models.CASCADE, related_name='teams'
    )
    # Капітан — завжди зареєстрований користувач
    captain = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='captained_teams',
        verbose_name="Капітан",
    )

    name    = models.CharField(max_length=200, verbose_name="Назва команди")
    city    = models.CharField(max_length=100, blank=True, verbose_name="Місто")
    contact = models.CharField(
        max_length=200, blank=True,
        verbose_name="Контактний Telegram / телефон"
    )

    # Статус: draft → registered
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        verbose_name="Статус команди",
    )

    # Токен для запрошення учасників у команду
    team_invite_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name="Токен запрошення в команду",
    )

    # Адмін може заблокувати склад вручну
    roster_locked = models.BooleanField(
        default=False,
        verbose_name="Склад зафіксований",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Один капітан — одна команда у турнірі
        unique_together = ('tournament', 'captain')
        ordering = ['created_at']
        verbose_name = 'Команда'
        verbose_name_plural = 'Команди'

    def __str__(self):
        return f"{self.name} ({self.tournament.name})"

    # ── Helpers ──────────────────────────────────────────────────────────────

    def is_roster_editable(self):
        """
        Склад можна редагувати якщо:
          • статус — draft  (не зареєстрована)
          • roster_locked == False
          • реєстрація у турнірі ще відкрита
        Адміни обходять цю перевірку у views.
        """
        if self.status == self.STATUS_REGISTERED:
            return False
        if self.roster_locked:
            return False
        t = self.tournament
        now = timezone.now()
        if t.registration_end and now > t.registration_end:
            return False
        return True

    def accepted_member_count(self):
        """Кількість учасників зі статусом 'accepted' (не рахуючи капітана)."""
        return self.members.filter(status=TeamMember.STATUS_ACCEPTED).count()

    def total_participant_count(self):
        """Загальна кількість: капітан (1) + прийняті учасники."""
        return 1 + self.accepted_member_count()

    def can_register(self):
        """
        True якщо команда може перейти зі статусу draft → registered:
          • мінімальна кількість учасників дотримана
          • реєстрація у турнірі ще відкрита
        """
        t = self.tournament
        min_size = t.min_team_size or 2
        if self.total_participant_count() < min_size:
            return False
        if not t.registration_open():
            return False
        return True

    def validate_max_size(self):
        t = self.tournament
        if t.max_team_size and self.accepted_member_count() + 1 >= t.max_team_size:
            raise ValidationError(
                f"Команда вже заповнена (максимум {t.max_team_size} учасників)."
            )


# ── TeamMember ────────────────────────────────────────────────────────────────

class TeamMember(models.Model):
    """
    Учасник команди — завжди зареєстрований користувач.

    Флоу:
      1. Капітан запрошує → status='pending'
      2. Юзер переходить за посиланням і приймає → status='accepted'
      3. Юзер може відхилити → запис видаляється
    """
    STATUS_PENDING  = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_CHOICES  = [
        (STATUS_PENDING,  'Запрошений'),
        (STATUS_ACCEPTED, 'У команді'),
    ]

    team   = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='members')
    user   = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='team_memberships',
        verbose_name="Учасник",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name="Статус запрошення",
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'user')
        ordering = ['added_at']
        verbose_name = 'Учасник команди'
        verbose_name_plural = 'Учасники команди'

    def __str__(self):
        return f"{self.user} → {self.team.name} [{self.status}]"

    def clean(self):
        if self.pk:
            return
        # Один юзер — одна команда у межах турніру
        conflict = TeamMember.objects.filter(
            team__tournament=self.team.tournament,
            user=self.user,
            status=self.STATUS_ACCEPTED,
        ).exclude(team=self.team).exists()
        if conflict:
            raise ValidationError(
                "Цей користувач вже є учасником іншої команди у цьому турнірі."
            )
        # Капітан не може бути учасником
        if self.user == self.team.captain:
            raise ValidationError(
                "Капітан не може бути доданий як учасник власної команди."
            )


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
    team        = models.ForeignKey(
        Team, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="submissions",
        verbose_name="Команда",
    )
    text         = models.TextField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
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
    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE,
        related_name="grades", verbose_name="Подання",
    )
    juror = models.ForeignKey(
        'users.User', on_delete=models.CASCADE,
        related_name="grades_given", verbose_name="Журі",
    )
    scores  = models.JSONField(default=dict, verbose_name="Бали за критеріями")
    comment = models.TextField(blank=True, default="", verbose_name="Коментар")
    total   = models.FloatField(default=0, verbose_name="Загальний бал")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата оцінювання")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата оновлення")

    class Meta:
        unique_together = ('submission', 'juror')
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.juror.username} → {self.submission} [{self.total}]"

    def recalc_total(self):
        self.total = sum(self.scores.values()) if self.scores else 0
        self.save(update_fields=['total'])


# ── JuryAssignment ────────────────────────────────────────────────────────────

class JuryAssignment(models.Model):
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE,
        related_name='jury_assignments', verbose_name='Турнір',
    )
    juror = models.ForeignKey(
        'users.User', on_delete=models.CASCADE,
        related_name='jury_assignments', verbose_name='Журі',
    )
    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE,
        related_name='jury_assignments', verbose_name='Подання',
    )
    assigned_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата призначення')

    class Meta:
        unique_together = ('juror', 'submission')
        ordering = ['assigned_at']
        verbose_name = 'Призначення журі'
        verbose_name_plural = 'Призначення журі'

    def __str__(self):
        return f'{self.juror.username} → {self.submission}'


# ── Announcements ─────────────────────────────────────────────────────────────

ANNOUNCEMENT_TARGET_CHOICES = [
    ('all',         'Усі учасники'),
    ('participant', 'Учасники'),
    ('jury',        'Журі'),
    ('admin',       'Адміністратори'),
    ('owner',       'Власник'),
]


class Announcement(models.Model):
    tournament  = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='announcements'
    )
    author      = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, related_name='announcements'
    )
    title       = models.CharField(max_length=200, verbose_name='Заголовок')
    body        = models.TextField(blank=True, verbose_name='Текст')
    target_role = models.CharField(
        max_length=20, choices=ANNOUNCEMENT_TARGET_CHOICES,
        default='all', verbose_name='Аудиторія'
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Оголошення'
        verbose_name_plural = 'Оголошення'

    def __str__(self):
        return f'[{self.tournament}] {self.title}'


class AnnouncementComment(models.Model):
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name='comments'
    )
    author     = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, related_name='announcement_comments'
    )
    text       = models.TextField(verbose_name='Текст')
    parent     = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        null=True, blank=True, related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Коментар'
        verbose_name_plural = 'Коментарі'

    def __str__(self):
        return f'{self.author} → [{self.announcement}]'


class AnnouncementReaction(models.Model):
    """
    Реакція на Оголошення АБО Коментар (nullable FK).
    Toggle: той самий emoji — знімаємо; інший — замінюємо.
    """
    user         = models.ForeignKey('users.User', on_delete=models.CASCADE)
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE,
        null=True, blank=True, related_name='reactions'
    )
    comment      = models.ForeignKey(
        AnnouncementComment, on_delete=models.CASCADE,
        null=True, blank=True, related_name='reactions'
    )
    emoji      = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'announcement'],
                condition=models.Q(announcement__isnull=False),
                name='unique_ann_reaction_per_user',
            ),
            models.UniqueConstraint(
                fields=['user', 'comment'],
                condition=models.Q(comment__isnull=False),
                name='unique_comment_reaction_per_user',
            ),
        ]
        verbose_name = 'Реакція'
        verbose_name_plural = 'Реакції'
