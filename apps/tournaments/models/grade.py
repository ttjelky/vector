from django.db import models

from .submission import Submission
from .tournament import Tournament


class Grade(models.Model):
    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE,
        related_name="grades", verbose_name="Подання",
    )
    juror = models.ForeignKey(
        'users.User', on_delete=models.CASCADE,
        related_name="grades_given", verbose_name="Журі",
    )
    scores     = models.JSONField(default=dict, verbose_name="Бали за критеріями")
    comment    = models.TextField(blank=True, default="", verbose_name="Коментар")
    total      = models.FloatField(default=0, verbose_name="Загальний бал")
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
