from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notification(models.Model):
    recipient   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    text        = models.TextField()
    tournament  = models.CharField(max_length=255, blank=True, default='')
    subject     = models.CharField(max_length=255, blank=True, default='')
    is_read     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"→ {self.recipient.username}: {self.subject or self.text[:40]}"


class NotificationAttachment(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='attachments')
    file         = models.FileField(upload_to='notification_attachments/')
    name         = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class NotificationLink(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='links')
    url          = models.URLField()
    label        = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.label or self.url