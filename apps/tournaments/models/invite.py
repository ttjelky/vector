import uuid
from django.conf import settings
from django.db import models


INVITE_ROLE_CHOICES = [
    ('participant', 'Учасник'),
    ('jury', 'Журі'),
    ('admin', 'Адміністратор'),
]

# Максимум посилань на турнір для кожної ролі
MAX_LINKS_PER_ROLE = 3


class TournamentInviteLink(models.Model):
    """Багаторазові унікальні посилання-запрошення (без PIN). Max 3 на роль."""
    tournament = models.ForeignKey(
        'tournaments.Tournament',
        on_delete=models.CASCADE,
        related_name='invite_links',
    )
    role = models.CharField(
        max_length=20, choices=INVITE_ROLE_CHOICES, default='participant'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=100, default='', blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_invite_links',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.tournament} [{self.role}] {self.name or self.token}"

    def save(self, *args, **kwargs):
        if not self.name:
            count = TournamentInviteLink.objects.filter(
                tournament=self.tournament, role=self.role
            ).count()
            self.name = f"Посилання {count + 1}"
        super().save(*args, **kwargs)
