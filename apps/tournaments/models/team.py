import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from .tournament import Tournament


class Team(models.Model):
    STATUS_DRAFT      = 'draft'
    STATUS_REGISTERED = 'registered'
    STATUS_CHOICES = [
        (STATUS_DRAFT,      'Чернетка'),
        (STATUS_REGISTERED, 'Зареєстрована'),
    ]

    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='teams'
    )
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
        verbose_name="Контактний Telegram / телефон",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        verbose_name="Статус команди",
    )

    team_invite_token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name="Токен запрошення в команду",
    )

    roster_locked = models.BooleanField(
        default=False,
        verbose_name="Склад зафіксований",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'captain')
        ordering = ['created_at']
        verbose_name = 'Команда'
        verbose_name_plural = 'Команди'

    def __str__(self):
        return f"{self.name} ({self.tournament.name})"

    def is_roster_editable(self):
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
        return self.members.filter(status=TeamMember.STATUS_ACCEPTED).count()

    def total_participant_count(self):
        return 1 + self.accepted_member_count()

    def can_register(self):
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
        conflict = TeamMember.objects.filter(
            team__tournament=self.team.tournament,
            user=self.user,
            status=self.STATUS_ACCEPTED,
        ).exclude(team=self.team).exists()
        if conflict:
            raise ValidationError(
                "Цей користувач вже є учасником іншої команди у цьому турнірі."
            )
        if self.user == self.team.captain:
            raise ValidationError(
                "Капітан не може бути доданий як учасник власної команди."
            )


class TeamUploadPermission(models.Model):
    """Капітан може видати право завантаження іншому учаснику команди."""
    team       = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='upload_permissions')
    user       = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='team_upload_permissions')
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'user')

    def __str__(self):
        return f"{self.user} може завантажувати за {self.team.name}"
