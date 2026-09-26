from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from ...models import Tournament, RegistrationField, RegistrationResponse
from ..serializers import RegistrationFieldSerializer, RegistrationResponseSerializer
from ..permissions import IsTournamentOwner, IsTournamentMemberOrOwner


def _get_role(request, tournament_pk):
    from ...models import TournamentMember
    m = TournamentMember.objects.filter(tournament_id=tournament_pk, user=request.user).first()
    return m.role if m else None


class RegistrationFieldListCreateView(generics.ListCreateAPIView):
    """GET / POST /tournaments/<pk>/registration-form/

    GET доступний учасникам турніру, а для публічних турнірів —
    будь-якому залогіненому (щоб бачити форму перед приєднанням).
    POST — тільки owner/admin.
    """
    serializer_class = RegistrationFieldSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RegistrationField.objects.filter(tournament_id=self.kwargs['tournament_pk'])

    def list(self, request, *args, **kwargs):
        from ...models import Tournament, TournamentMember
        try:
            tournament = Tournament.objects.get(pk=self.kwargs['tournament_pk'])
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)
        is_member = TournamentMember.objects.filter(
            tournament=tournament, user=request.user
        ).exists()
        if not tournament.is_public and not is_member:
            return Response({'detail': 'Доступ заборонено.'}, status=403)
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        tournament = Tournament.objects.get(pk=self.kwargs['tournament_pk'])
        # Тільки owner/admin
        role = _get_role(self.request, self.kwargs['tournament_pk'])
        if role not in ('owner', 'admin'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Тільки власник або адміністратор може редагувати форму.')
        # order = max+1 якщо не вказано
        order = serializer.validated_data.get('order', 0)
        if not order:
            last = RegistrationField.objects.filter(tournament=tournament).order_by('-order').first()
            order = (last.order + 1) if last else 0
        serializer.save(tournament=tournament, order=order)


class RegistrationFieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RegistrationFieldSerializer
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get_queryset(self):
        return RegistrationField.objects.filter(tournament_id=self.kwargs['tournament_pk'])


class RegistrationResponseListView(APIView):
    """GET /tournaments/<pk>/registration-responses/ — всі відповіді (owner/admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        role = _get_role(request, tournament_pk)
        if role not in ('owner', 'admin'):
            return Response({'detail': 'Тільки власник або адміністратор.'}, status=403)
        qs = (
            RegistrationResponse.objects
            .filter(tournament_id=tournament_pk)
            .select_related('user')
            .order_by('submitted_at')
        )
        return Response(RegistrationResponseSerializer(qs, many=True).data)


class MyRegistrationResponseView(APIView):
    """GET /tournaments/<pk>/registration-responses/me/ — своя відповідь."""
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        try:
            resp = RegistrationResponse.objects.get(tournament_id=tournament_pk, user=request.user)
        except RegistrationResponse.DoesNotExist:
            return Response({'detail': 'Відповідь не знайдено.', 'answers': {}},
                            status=404)
        return Response(RegistrationResponseSerializer(resp).data)
