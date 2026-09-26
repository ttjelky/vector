import uuid
import random
from django.db import models
from django.utils import timezone


def generate_invite_pin():
    return str(random.randint(100000, 999999))


TOURNAMENT_ROLE_CHOICES = [
    ('owner',       'Власник'),
    ('participant', 'Учасник'),
    ('jury',        'Журі'),
    ('admin',       'Адміністратор'),
]

TOKEN_FIELD_TO_ROLE = {
    'invite_token':       'participant',
    'jury_invite_token':  'jury',
    'admin_invite_token': 'admin',
}


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

    tournament_type = models.CharField(
        max_length=10,
        choices=TOURNAMENT_TYPE_CHOICES,
        default='solo',
        verbose_name="Тип турніру",
    )

    start_date         = models.DateTimeField(null=True, blank=True)
    end_date           = models.DateTimeField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end   = models.DateTimeField(null=True, blank=True)

    max_teams     = models.IntegerField(null=True, blank=True)
    min_team_size = models.IntegerField(null=True, blank=True)
    max_team_size = models.IntegerField(null=True, blank=True)

    invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    jury_invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    jury_invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    admin_invite_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    admin_invite_pin   = models.CharField(max_length=6, default=generate_invite_pin)

    leaderboard_published = models.BooleanField(default=False)

    is_public = models.BooleanField(
        default=False,
        verbose_name="Публічний турнір",
        help_text="Публічні турніри видно в каталозі, до них можна приєднатись в 1 клік без посилання.",
    )

    registration_exception_until = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Реєстрація відкрита до (виняток)",
    )

    open_registration = models.BooleanField(
        default=False,
        verbose_name="Вільна реєстрація",
        help_text="Якщо увімкнено — учасники можуть приєднуватись будь-коли до завершення турніру.",
    )

    # ── Реєстрація: відкрита чи ні + причина ────────────────────────────────
    #
    # Семантика (порядок перевірок):
    #   1. Виняток (registration_exception_until) — завжди відкрито.
    #   2. Турнір завершено (end_date в минулому) — закрито (finished).
    #   3. Вільна реєстрація (open_registration) — відкрито.
    #   4. Явне вікно (registration_start / registration_end):
    #        now < start → закрито (not_started, з датою початку)
    #        now > end   → закрито (ended, з датою кінця)
    #        інакше      → відкрито.
    #   5. Дат немає взагалі — відкрито до завершення турніру (open).

    def registration_status(self):
        """Повертає (is_open: bool, reason: str, message: str|None).

        reason — одне з: open, exception, finished, not_started, ended.
        """
        now = timezone.now()

        if self.registration_exception_until and now < self.registration_exception_until:
            return True, 'exception', None

        if self.end_date and now > self.end_date:
            return (
                False, 'finished',
                f"Турнір завершено {self.end_date.strftime('%d.%m.%Y, %H:%M')}. Реєстрація закрита."
            )

        if self.open_registration:
            return True, 'open', None

        if self.registration_start or self.registration_end:
            if self.registration_start and now < self.registration_start:
                return (
                    False, 'not_started',
                    f"Реєстрація ще не відкрилась. Початок: "
                    f"{self.registration_start.strftime('%d.%m.%Y, %H:%M')}."
                )
            if self.registration_end and now > self.registration_end:
                return (
                    False, 'ended',
                    f"Реєстрація завершилась "
                    f"{self.registration_end.strftime('%d.%m.%Y, %H:%M')}."
                )
            return True, 'open', None

        return True, 'open', None

    def registration_open(self):
        is_open, _, _ = self.registration_status()
        return is_open

    def is_registration_open(self):
        # Аліас для сумісності — та сама логіка, що й registration_open().
        return self.registration_open()

    def get_invite_token_for_role(self, role):
        return {
            'participant': self.invite_token,
            'jury':        self.jury_invite_token,
            'admin':       self.admin_invite_token,
        }.get(role)

    def get_invite_pin_for_role(self, role):
        return {
            'participant': self.invite_pin,
            'jury':        self.jury_invite_pin,
            'admin':       self.admin_invite_pin,
        }.get(role)

    def set_invite_pin_for_role(self, role):
        new_pin = generate_invite_pin()
        field_map = {
            'participant': 'invite_pin',
            'jury':        'jury_invite_pin',
            'admin':       'admin_invite_pin',
        }
        if role in field_map:
            setattr(self, field_map[role], new_pin)
            self.save(update_fields=[field_map[role]])
        return new_pin

    def __str__(self):
        return self.name


class TournamentMember(models.Model):
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='members'
    )
    user = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='tournament_memberships'
    )
    role      = models.CharField(max_length=20, choices=TOURNAMENT_ROLE_CHOICES, default='participant')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user} — {self.tournament} [{self.role}]"
