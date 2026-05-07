"""
apps/tournaments/management/commands/send_reminders.py

Fallback якщо Celery немає — запускай через cron:
  0 * * * * cd /path/to/project && python manage.py send_reminders

Або вручну:
  python manage.py send_reminders
"""
from django.core.management.base import BaseCommand
from apps.tournaments.tasks import send_tournament_reminders


class Command(BaseCommand):
    help = "Надсилає нагадування учасникам про турніри що починаються/закриваються завтра"

    def handle(self, *args, **options):
        result = send_tournament_reminders()
        self.stdout.write(self.style.SUCCESS(result))