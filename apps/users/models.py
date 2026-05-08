from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework.permissions import BasePermission


ROLE_CHOICES = [
    ('admin', 'Admin'),
    ('participant', 'Participant'),
    ('jury', 'Jury'),
]


class User(AbstractUser):
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

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
