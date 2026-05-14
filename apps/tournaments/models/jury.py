from django.db import models

from .tournament import Tournament


class JuryGradingCriterion(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name="grading_criteria",
        verbose_name="Турнір",
    )
    key = models.SlugField(
        max_length=80,
        verbose_name="Ключ (slug)",
        help_text="Унікальний slug у межах турніру. Використовується як ключ у Grade.scores",
    )
    label     = models.CharField(max_length=200, verbose_name="Назва критерію")
    max_score = models.PositiveSmallIntegerField(default=10, verbose_name="Максимальний бал")
    group     = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="Група",
        help_text="Необов'язкова назва групи критеріїв (напр. 'Технічна частина')",
    )
    hint = models.CharField(
        max_length=300,
        blank=True,
        default="",
        verbose_name="Підказка",
        help_text="Коротка підказка для журі, що саме оцінювати",
    )
    order = models.PositiveSmallIntegerField(default=0, verbose_name="Порядок відображення")

    class Meta:
        ordering = ["order", "id"]
        unique_together = ("tournament", "key")
        verbose_name = "Критерій оцінювання"
        verbose_name_plural = "Критерії оцінювання"

    def __str__(self):
        return f"[{self.tournament.name}] {self.label} (макс. {self.max_score})"
