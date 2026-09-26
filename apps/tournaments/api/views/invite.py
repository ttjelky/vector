from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from ...models import Tournament, TournamentInviteLink, MAX_LINKS_PER_ROLE
from ..serializers import TournamentInviteLinkSerializer
from ..permissions import IsTournamentOwner

BASE_URL = "http://localhost:5173"

INVITABLE_ROLES = ('participant', 'jury', 'admin')


def find_tournament_and_role(token_str):
    """Шукає турнір за новими лінками, потім за legacy полями. Повертає (tournament, role)."""
    link = TournamentInviteLink.objects.filter(token=token_str).select_related('tournament').first()
    if link:
        return link.tournament, link.role
    for field, role in [
        ('invite_token', 'participant'),
        ('jury_invite_token', 'jury'),
        ('admin_invite_token', 'admin'),
    ]:
        try:
            t = Tournament.objects.get(**{field: token_str})
            return t, role
        except (Tournament.DoesNotExist, ValueError):
            continue
    return None, None


class InviteLinkListCreateView(APIView):
    """GET/POST /tournaments/<pk>/invite-links/?role=participant — max 3 на роль, без PIN."""
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get(self, request, tournament_pk):
        role = request.query_params.get('role')
        qs = TournamentInviteLink.objects.filter(tournament_id=tournament_pk)
        if role:
            qs = qs.filter(role=role)
        qs = qs.order_by('created_at')
        data = TournamentInviteLinkSerializer(qs, many=True).data
        # Додаємо повні URL
        for item in data:
            item['invite_url'] = f"{BASE_URL}/join/{item['token']}"
        return Response(data)

    def post(self, request, tournament_pk):
        role = request.data.get('role', request.query_params.get('role', 'participant'))
        if role not in INVITABLE_ROLES:
            return Response(
                {'detail': f'Невірна роль. Допустимі: {", ".join(INVITABLE_ROLES)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        count = TournamentInviteLink.objects.filter(tournament=tournament, role=role).count()
        if count >= MAX_LINKS_PER_ROLE:
            return Response(
                {'detail': f'Максимум {MAX_LINKS_PER_ROLE} посилання для ролі «{role}». Видаліть старе щоб створити нове.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = (request.data.get('name') or '').strip()
        link = TournamentInviteLink.objects.create(
            tournament=tournament, role=role, name=name,
            created_by=request.user,
        )
        data = TournamentInviteLinkSerializer(link).data
        data['invite_url'] = f"{BASE_URL}/join/{link.token}"
        return Response(data, status=status.HTTP_201_CREATED)


class InviteLinkDeleteView(APIView):
    """DELETE /tournaments/<pk>/invite-links/<link_id>/"""
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def delete(self, request, tournament_pk, link_id):
        try:
            link = TournamentInviteLink.objects.get(pk=link_id, tournament_id=tournament_pk)
        except TournamentInviteLink.DoesNotExist:
            return Response({'detail': 'Посилання не знайдено.'}, status=404)
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
