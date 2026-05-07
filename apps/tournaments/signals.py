"""
apps/tournaments/signals.py

Автоматичні сповіщення при подіях турніру:
  - Новий учасник приєднався
  - Турнір створено (власнику)
  - Новий раунд додано
  - Нова здача роботи (журі + власнику)
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import TournamentMember, Tournament, Round, Submission


def _create_notif(recipient, sender, subject, text, tournament_name=""):
    """Хелпер — створює Notification без циклічного імпорту."""
    from apps.notifications.models import Notification
    Notification.objects.create(
        recipient=recipient,
        sender=sender,
        subject=subject,
        text=text,
        tournament=tournament_name,
    )


def _get_owners(tournament):
    """Повертає queryset користувачів з роллю owner у турнірі."""
    return [
        m.user for m in tournament.members.filter(role="owner").select_related("user")
    ]


# ── 1. Новий учасник приєднався ───────────────────────────────────────────────
@receiver(post_save, sender=TournamentMember)
def notify_new_member(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.role == "owner":
        return  # власника не сповіщаємо про самого себе

    tournament = instance.tournament
    new_user   = instance.user
    role_labels = {
        "participant": "учасник",
        "jury":        "член журі",
        "admin":       "адміністратор",
    }
    role_label = role_labels.get(instance.role, instance.role)

    full_name = f"{new_user.first_name} {new_user.last_name}".strip() or new_user.username

    for owner in _get_owners(tournament):
        _create_notif(
            recipient=owner,
            sender=new_user,
            subject="Новий учасник",
            text=f"{full_name} приєднався як {role_label}.",
            tournament_name=tournament.name,
        )


# ── 2. Турнір створено ────────────────────────────────────────────────────────
@receiver(post_save, sender=Tournament)
def notify_tournament_created(sender, instance, created, **kwargs):
    if not created:
        return
    # Власник ще не доданий у момент створення Tournament (додається у view),
    # тому надсилаємо через post_save на TournamentMember нижче.
    pass  # Логіка — у notify_owner_on_join


@receiver(post_save, sender=TournamentMember)
def notify_owner_on_join(sender, instance, created, **kwargs):
    """Власнику — підтвердження що турнір створено (спрацьовує один раз)."""
    if not created:
        return
    if instance.role != "owner":
        return

    _create_notif(
        recipient=instance.user,
        sender=None,
        subject="Турнір створено",
        text=f'Турнір "{instance.tournament.name}" успішно створено. Запрошуйте учасників!',
        tournament_name=instance.tournament.name,
    )


# ── 3. Новий раунд додано ─────────────────────────────────────────────────────
@receiver(post_save, sender=Round)
def notify_new_round(sender, instance, created, **kwargs):
    if not created:
        return

    tournament = instance.tournament
    members = tournament.members.filter(
        role__in=["participant", "jury", "admin"]
    ).select_related("user")

    # Знаходимо власника для sender
    owner_member = tournament.members.filter(role="owner").select_related("user").first()
    owner_user   = owner_member.user if owner_member else None

    for m in members:
        _create_notif(
            recipient=m.user,
            sender=owner_user,
            subject="Новий раунд",
            text=f'Розпочато новий раунд: "{instance.title}". Перевірте завдання!',
            tournament_name=tournament.name,
        )


# ── 4. Нова здача роботи (учасник здав) ──────────────────────────────────────
@receiver(post_save, sender=Submission)
def notify_new_submission(sender, instance, created, **kwargs):
    if not created:
        return

    tournament = instance.task.round.tournament
    participant = instance.participant

    full_name = f"{participant.first_name} {participant.last_name}".strip() or participant.username

    # Повідомляємо власника та журі
    recipients = tournament.members.filter(
        role__in=["owner", "admin", "jury"]
    ).select_related("user")

    for m in recipients:
        _create_notif(
            recipient=m.user,
            sender=participant,
            subject="Нова здача роботи",
            text=f'{full_name} здав роботу по завданню "{instance.task.title}".',
            tournament_name=tournament.name,
        )