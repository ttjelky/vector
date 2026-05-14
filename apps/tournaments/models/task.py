from django.db import models

from .round import Round


class Task(models.Model):
    round             = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="tasks")
    title             = models.CharField(max_length=255, verbose_name="Назва завдання")
    description       = models.TextField(null=True, blank=True, verbose_name="Опис завдання")
    tech_requirements = models.JSONField(null=True, blank=True, verbose_name="Вимоги до технологій")
    must_have         = models.JSONField(null=True, blank=True, verbose_name="Must have")
    created_at        = models.DateTimeField(auto_now_add=True)

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
