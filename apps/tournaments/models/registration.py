from django.conf import settings
from django.db import models


FIELD_TYPE_CHOICES = [
    ('text', 'Короткий текст'),
    ('textarea', 'Довгий текст'),
    ('number', 'Число'),
    ('date', 'Дата'),
    ('select', 'Випадаючий список'),
    ('radio', 'Один варіант'),
    ('checkbox', 'Кілька варіантів'),
]

CHOICE_TYPES = {'select', 'radio', 'checkbox'}


class RegistrationField(models.Model):
    """Кастомне поле форми реєстрації турніру (як Google Forms)."""
    tournament = models.ForeignKey(
        'tournaments.Tournament',
        on_delete=models.CASCADE,
        related_name='registration_fields',
    )
    label = models.CharField(max_length=255, verbose_name="Питання / назва поля")
    field_type = models.CharField(
        max_length=20, choices=FIELD_TYPE_CHOICES, default='text'
    )
    required = models.BooleanField(default=False)
    # Для select/radio/checkbox — список рядків-варіантів
    options = models.JSONField(default=list, blank=True)
    placeholder = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.tournament} — {self.label}"


class RegistrationResponse(models.Model):
    """Відповіді учасника на форму реєстрації. answers: {field_id: value}."""
    tournament = models.ForeignKey(
        'tournaments.Tournament',
        on_delete=models.CASCADE,
        related_name='registration_responses',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='registration_responses',
    )
    answers = models.JSONField(default=dict, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('tournament', 'user')
        ordering = ['submitted_at']

    def __str__(self):
        return f"{self.user} → {self.tournament}"
