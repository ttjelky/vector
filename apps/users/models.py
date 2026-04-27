from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from rest_framework.permissions import BasePermission


ROLE_CHOICES = [
    ('admin', 'Admin'),
    ('participant', 'Participant'),
    ('jury', 'Jury'),
]


class User(AbstractUser):
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return str(self.user)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'
