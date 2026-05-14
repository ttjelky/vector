from django.db import models

from .task import Task
from .team import Team


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
