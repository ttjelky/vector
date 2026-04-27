from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import TournamentMember


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
    GET-запити: дозволяє власникам і учасникам турніру.
    POST/PATCH/PUT/DELETE: тільки власник.
    """
    message = "Ви не є учасником цього турніру."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tournament_id = get_tournament_id(view)
        if not tournament_id:
            return False

        is_member = TournamentMember.objects.filter(
            tournament_id=tournament_id,
            user=request.user,
        ).exists()

        if not is_member:
            return False

        # Безпечні методи (GET, HEAD, OPTIONS) — дозволені всім учасникам
        if request.method in SAFE_METHODS:
            return True

        # Мутації — тільки власник
        return TournamentMember.objects.filter(
            tournament_id=tournament_id,
            user=request.user,
            role='owner',
        ).exists()
