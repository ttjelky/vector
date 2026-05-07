"""
apps/tournaments/tasks.py

Celery-задача: нагадування про закінчення реєстрації та початок турніру.

Запускати через Celery Beat (або django-crontab / cron):
  - кожні 60 хвилин або раз на добу

Додай у settings.py:
  CELERY_BEAT_SCHEDULE = {
      "tournament-reminders": {
          "task": "apps.tournaments.tasks.send_tournament_reminders",
          "schedule": crontab(minute=0),  # кожну годину
      },
  }

Якщо Celery немає — можна викликати send_tournament_reminders() вручну
з management command або через cron + Django shell.
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

from .models import Tournament, TournamentMember


def _create_notif(recipient, sender, subject, text, tournament_name=""):
    from apps.notifications.models import Notification
    Notification.objects.create(
        recipient=recipient,
        sender=sender,
        subject=subject,
        text=text,
        tournament=tournament_name,
    )


@shared_task
def send_tournament_reminders():
    """
    Надсилає нагадування:
      1. Реєстрація закінчується завтра
      2. Турнір починається завтра
    Викликається щогодини — дедуплікація через перевірку існуючих сповіщень.
    """
    now = timezone.now()
    tomorrow_start = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    tomorrow_end   = tomorrow_start + timedelta(days=1)

    from apps.notifications.models import Notification

    # ── 1. Реєстрація закінчується завтра ────────────────────────────────────
    closing_soon = Tournament.objects.filter(
        registration_end__gte=tomorrow_start,
        registration_end__lt=tomorrow_end,
    )

    for tournament in closing_soon:
        members = TournamentMember.objects.filter(
            tournament=tournament,
        ).select_related("user")

        for m in members:
            already_sent = Notification.objects.filter(
                recipient=m.user,
                subject="Реєстрація закривається",
                tournament=tournament.name,
            ).exists()

            if not already_sent:
                _create_notif(
                    recipient=m.user,
                    sender=None,
                    subject="Реєстрація закривається",
                    text=f'Реєстрація на турнір "{tournament.name}" закривається завтра. Встигніть зареєструватись!',
                    tournament_name=tournament.name,
                )

    # ── 2. Турнір починається завтра ─────────────────────────────────────────
    starting_soon = Tournament.objects.filter(
        start_date__gte=tomorrow_start,
        start_date__lt=tomorrow_end,
    )

    for tournament in starting_soon:
        members = TournamentMember.objects.filter(
            tournament=tournament,
        ).select_related("user")

        for m in members:
            already_sent = Notification.objects.filter(
                recipient=m.user,
                subject="Турнір завтра",
                tournament=tournament.name,
            ).exists()

            if not already_sent:
                _create_notif(
                    recipient=m.user,
                    sender=None,
                    subject="Турнір завтра",
                    text=f'"{tournament.name}" розпочнеться завтра. Будьте готові!',
                    tournament_name=tournament.name,
                )

    return f"Reminders sent. Checked {closing_soon.count()} closing + {starting_soon.count()} starting."