from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail
from django.dispatch import receiver
from django.db.models.signals import post_save
from django.conf import settings
from .models import Profile

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    reset_url = f"{frontend_url}/reset-password?token={reset_password_token.key}"

    message = f"Привіт! Використовуй це посилання для зміни пароля: {reset_url}"
    
    send_mail(
        "Скидання паролю для Vector",
        message,
        "noreply@vector.com",
        [reset_password_token.user.email]
    )

def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)