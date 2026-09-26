from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from rest_framework.permissions import BasePermission
import random
from datetime import timedelta


ROLE_CHOICES = [
    ('admin', 'Admin'),
    ('participant', 'Participant'),
    ('jury', 'Jury'),
]


class User(AbstractUser):
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')


class EmailVerificationCode(models.Model):
    """6-значний код підтвердження пошти при реєстрації."""
    email = models.EmailField(db_index=True, verbose_name="Email")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_codes',
        null=True, blank=True,
    )
    code = models.CharField(max_length=6, verbose_name="Код")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(verbose_name="Дійсний до")
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', '-created_at']),
        ]

    def __str__(self):
        return f"{self.email} — {self.code}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @classmethod
    def generate(cls, email, user=None, ttl_minutes=15):
        code = str(random.randint(100000, 999999))
        return cls.objects.create(
            email=email,
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=ttl_minutes),
        )


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    banner = models.ImageField(upload_to="banners/", null=True, blank=True)
    bio = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=32, blank=True, default="")

    def __str__(self):
        return str(self.user)


# Автоматично створює Profile при створенні нового User
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'
