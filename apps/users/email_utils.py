"""Відправка транзакційних листів (коди верифікації, reset-password).

SMTP з хостингів на кшталт Railway заблоковано (Network is unreachable),
тому листи йдуть через HTTP API. Провайдер обирається змінною EMAIL_PROVIDER:
  - "brevo"   — Brevo API (потрібен BREVO_API_KEY; sender підтверджується в Senders);
  - "mailjet" — Mailjet API v3.1 (потрібні MAILJET_API_KEY/MAILJET_API_SECRET;
    sender підтверджується листом, свій домен і номер телефону не потрібні);
  - "smtp2go" — SMTP2GO API (потрібен SMTP2GO_API_KEY; sender підтверджується
    листом, свій домен і номер телефону не потрібні);
  - "smtp"    — звичайний Django SMTP (для локалі/VPS);
  - "auto" (за замовчуванням) — перший налаштований з HTTP-провайдерів,
    інакше SMTP.

Функції ніколи не кидають виняток: повертають True/False.
"""
import base64
import json
import urllib.request

from django.conf import settings
from django.core.mail import send_mail


TIMEOUT = 10


def _post_json(url, payload, headers):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"content-type": "application/json", **headers},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.status, resp.read()


def _send_via_brevo(to_email, subject, text):
    from_addr = (
        getattr(settings, "BREVO_SENDER", "")
        or getattr(settings, "EMAIL_HOST_USER", "")
    )
    payload = {
        "sender": {"name": "Vector", "email": from_addr},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text,
    }
    try:
        status, _ = _post_json(
            "https://api.brevo.com/v3/smtp/email",
            payload,
            {"accept": "application/json", "api-key": getattr(settings, "BREVO_API_KEY", "")},
        )
        return 200 <= status < 300
    except Exception as exc:
        print(f"[Email] Brevo API error to {to_email}: {exc}")
        return False


def _send_via_mailjet(to_email, subject, text):
    from_addr = (
        getattr(settings, "MAILJET_SENDER", "")
        or getattr(settings, "EMAIL_HOST_USER", "")
    )
    token = base64.b64encode(
        f"{getattr(settings, 'MAILJET_API_KEY', '')}:{getattr(settings, 'MAILJET_API_SECRET', '')}".encode()
    ).decode()
    payload = {
        "Messages": [{
            "From": {"Email": from_addr, "Name": "Vector"},
            "To": [{"Email": to_email}],
            "Subject": subject,
            "TextPart": text,
        }]
    }
    try:
        status, _ = _post_json(
            "https://api.mailjet.com/v3.1/send",
            payload,
            {"authorization": f"Basic {token}"},
        )
        return 200 <= status < 300
    except Exception as exc:
        print(f"[Email] Mailjet API error to {to_email}: {exc}")
        return False


def _send_via_smtp2go(to_email, subject, text):
    from_addr = (
        getattr(settings, "SMTP2GO_SENDER", "")
        or getattr(settings, "EMAIL_HOST_USER", "")
    )
    payload = {
        "api_key": getattr(settings, "SMTP2GO_API_KEY", ""),
        "sender": f"Vector <{from_addr}>",
        "to": [to_email],
        "subject": subject,
        "text_body": text,
    }
    try:
        status, body = _post_json(
            "https://api.smtp2go.com/v3/email/send", payload, {}
        )
        ok = '"succeeded":1' in body.decode("utf-8", "ignore").replace(" ", "")
        return 200 <= status < 300 and ok
    except Exception as exc:
        print(f"[Email] SMTP2GO API error to {to_email}: {exc}")
        return False


def _send_via_smtp(to_email, subject, text):
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


def _active_provider() -> str:
    provider = (getattr(settings, "EMAIL_PROVIDER", "") or "auto").lower()
    if provider != "auto":
        return provider
    if getattr(settings, "BREVO_API_KEY", ""):
        return "brevo"
    if getattr(settings, "MAILJET_API_KEY", ""):
        return "mailjet"
    if getattr(settings, "SMTP2GO_API_KEY", ""):
        return "smtp2go"
    return "smtp"


def send_transactional_email(to_email: str, subject: str, text: str) -> bool:
    """Надіслати лист. Повертає True лише при успіху. Не кидає винятків."""
    provider = _active_provider()
    if provider == "brevo":
        return _send_via_brevo(to_email, subject, text)
    if provider == "mailjet":
        return _send_via_mailjet(to_email, subject, text)
    if provider == "smtp2go":
        return _send_via_smtp2go(to_email, subject, text)
    return _send_via_smtp(to_email, subject, text)
