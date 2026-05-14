from django.db import models

from .tournament import Tournament


class Round(models.Model):
    tournament        = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="rounds")
    title             = models.CharField(max_length=255, verbose_name="Назва")
    description       = models.TextField(null=True, blank=True, verbose_name="Опис")
    start_date        = models.DateTimeField(null=True, blank=True, verbose_name="Початок")
    end_date          = models.DateTimeField(null=True, blank=True, verbose_name="Кінець")
    tech_requirements = models.JSONField(
        null=True, blank=True,
        verbose_name="Вимоги до технологій",
        help_text="Список об'єктів [{category, value}]",
    )
    must_have  = models.JSONField(
        null=True, blank=True,
        verbose_name="Must have — обов'язкові критерії",
        help_text="Список рядків [\"вимога 1\", \"вимога 2\"]",
    )
    created_at = models.DateTimeField(auto_now_add=True)

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
