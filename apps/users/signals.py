from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail
from django.dispatch import receiver

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    reset_url = f"http://localhost:5173/reset-password?token={reset_password_token.key}"

    message = f"Привіт! Використовуй це посилання для зміни пароля: {reset_url}"
    
    send_mail(
        "Скидання паролю для Vector",
        message,
        "noreply@vector.com",
        [reset_password_token.user.email]
    )