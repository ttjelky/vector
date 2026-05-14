from rest_framework.permissions import BasePermission, SAFE_METHODS
from ..models import TournamentMember


def get_tournament_id(view):
    """Витягує tournament_pk або pk з kwargs в'юхи."""
    return view.kwargs.get('tournament_pk') or view.kwargs.get('pk')


class IsTournamentOwner(BasePermission):
    """
    Дозволяє доступ тільки власнику турніру (role='owner' в TournamentMember).
    """
    message = "Тільки власник турніру може виконати цю дію."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tournament_id = get_tournament_id(view)
        if not tournament_id:
            return False
        return TournamentMember.objects.filter(
            tournament_id=tournament_id,
            user=request.user,
            role='owner',
        ).exists()


class IsTournamentMemberOrOwner(BasePermission):
    """
    GET-запити: дозволяє власникам, адмінам, журі та учасникам турніру.
    POST/PATCH/PUT/DELETE: тільки owner і admin.
    """
    message = "Ви не є учасником цього турніру."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tournament_id = get_tournament_id(view)
        if not tournament_id:
            return False

        membership = TournamentMember.objects.filter(
            tournament_id=tournament_id,
            user=request.user,
        ).first()

        if not membership:
            return False

        # Безпечні методи (GET, HEAD, OPTIONS) — дозволені всім учасникам
        if request.method in SAFE_METHODS:
            return True

        # Мутації — тільки owner і admin
        return membership.role in ('owner', 'admin')


class IsTournamentParticipant(BasePermission):
    """
    Дозволяє будь-який метод будь-якому члену турніру
    (owner, admin, jury, participant).
    """
    message = "Ви не є учасником цього турніру."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tournament_id = get_tournament_id(view)
        if not tournament_id:
            return False

        return TournamentMember.objects.filter(
            tournament_id=tournament_id,
            user=request.user,
        ).exists()


class IsTournamentJury(BasePermission):
    """
    Дозволяє доступ тільки журі, адміну або власнику турніру.
    Використовується для ендпоінтів панелі журі.
    """
    message = "Доступ дозволено тільки членам журі."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tournament_id = get_tournament_id(view)
        if not tournament_id:
            return False

        membership = TournamentMember.objects.filter(
            tournament_id=tournament_id,
            user=request.user,
        ).first()

        if not membership:
            return False

        return membership.role in ('jury', 'owner', 'admin')
