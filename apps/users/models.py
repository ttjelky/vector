from django.db import models
<<<<<<< HEAD
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from rest_framework.permissions import BasePermission
from django.contrib import admin

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)

    def __str__(self):
        return str(self.user)
    
=======
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from rest_framework.permissions import BasePermission


>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
ROLE_CHOICES = [
    ('admin', 'Admin'),
    ('team', 'Team'),
    ('jury', 'Jury'),
]

class User(AbstractUser):
<<<<<<< HEAD
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)

role = models.CharField(
    max_length=10,
    choices=ROLE_CHOICES,
    default='team'
)
=======
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='team')

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'
<<<<<<< HEAD
    
=======


>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
class Tournament(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('registration', 'Registration'),
        ('running', 'Running'),
        ('finished', 'Finished'),
    ]

    FORMAT_CHOICES = [
        ('single', 'Single round'),
        ('multi', 'Multiple rounds'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField()
<<<<<<< HEAD

    start_date = models.DateTimeField()

    registration_start = models.DateTimeField()
    registration_end = models.DateTimeField()

    max_teams = models.IntegerField(null=True, blank=True)

    format = models.CharField(max_length=10, choices=FORMAT_CHOICES)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    created_by = models.ForeignKey('users.User', on_delete=models.CASCADE)

    def __str__(self):
        return self.name
    
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'start_date')
    list_filter = ('status',)
    search_fields = ('name',)
=======
    start_date = models.DateTimeField()
    registration_start = models.DateTimeField()
    registration_end = models.DateTimeField()
    max_teams = models.IntegerField(null=True, blank=True)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return self.name
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
