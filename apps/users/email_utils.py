"""Відправка транзакційних листів (коди верифікації, reset-password).

Канал обирається автоматично:
- якщо задано BREVO_API_KEY — HTTP API Brevo (працює з хостингів на кшталт
  Railway, де вихідний SMTP заблоковано; безкоштовно ~300 листів/день,
  свій домен не потрібен — достатньо підтвердити адресу відправника
  на сторінці Brevo → Senders);
- інакше — звичайний Django SMTP (send_mail).

Функції ніколи не кидають виняток: повертають True/False.
"""
import json
import urllib.request

from django.conf import settings
from django.core.mail import send_mail


BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"
TIMEOUT = 10


def _sender() -> str:
    """Адреса відправника: для Brevo вона має бути підтверджена в Senders."""
    return (
        getattr(settings, "BREVO_SENDER", "")
        or getattr(settings, "EMAIL_HOST_USER", "")
        or "noreply@vector.com"
    )


def _send_via_brevo(to_email: str, subject: str, text: str) -> bool:
    api_key = getattr(settings, "BREVO_API_KEY", "")
    if not api_key:
        return False
    payload = {
        "sender": {"name": "Vector", "email": _sender()},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text,
    }
    req = urllib.request.Request(
        BREVO_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return 200 <= resp.status < 300
    except Exception as exc:
        print(f"[Email] Brevo API error to {to_email}: {exc}")
        return False


def send_transactional_email(to_email: str, subject: str, text: str) -> bool:
    """Надіслати лист. Повертає True лише при успіху. Не кидає винятків."""
    if getattr(settings, "BREVO_API_KEY", ""):
        return _send_via_brevo(to_email, subject, text)
    try:
        send_mail(
            subject,
            text,
            getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@vector.com"),
            [to_email],
            fail_silently=False,
        )
        return True
    except Exception as exc:
        print(f"[Email] SMTP error to {to_email}: {exc}")
        return False
