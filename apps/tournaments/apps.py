from django.apps import AppConfig


class TournamentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tournaments"

    def ready(self):
        import apps.tournaments.signals  # noqa: F401 — реєструємо сигнали