from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Tournament, TournamentMember, Round, RoundLink, RoundAttachment, Task, TaskLink, TaskAttachment
from .serializers import (
    TournamentSerializer, TournamentMemberSerializer, JoinByTokenSerializer,
    RoundSerializer,
    RoundLinkSerializer, RoundAttachmentSerializer,
    TaskSerializer, TaskLinkSerializer, TaskAttachmentSerializer,
)
from .permissions import IsTournamentOwner, IsTournamentMemberOrOwner


# ── Tournament views ──────────────────────────────────────────────────────────

class TournamentCreateView(generics.ListCreateAPIView):
    """
    GET  /api/tournaments/  — тільки турніри де поточний юзер є членом
    POST /api/tournaments/  — створити турнір (автоматично стає owner)
    """
    serializer_class   = TournamentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Tournament.objects.filter(members__user=self.request.user)

    def perform_create(self, serializer):
        tournament = serializer.save()
        TournamentMember.objects.create(
            tournament=tournament,
            user=self.request.user,
            role='owner',
        )


class TournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/tournaments/{id}/   — отримати турнір (власник або учасник)
    PATCH  /api/tournaments/{id}/   — редагувати (тільки власник)
    DELETE /api/tournaments/{id}/   — видалити (тільки власник)
    """
    queryset           = Tournament.objects.all()
    serializer_class   = TournamentSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]


# ── My role in tournament ─────────────────────────────────────────────────────

class MyTournamentRoleView(APIView):
    """
    GET /api/tournaments/{tournament_pk}/my-role/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        membership = TournamentMember.objects.filter(
            tournament_id=tournament_pk,
            user=request.user,
        ).first()

        role = membership.role if membership else None
        return Response({'role': role})


# ── Invite / Join views ───────────────────────────────────────────────────────

class TournamentInviteLinkView(APIView):
    """
    GET /api/tournaments/{tournament_pk}/invite-link/
    Повертає invite_token і invite_pin (тільки власник).
    """
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get(self, request, tournament_pk):
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'invite_token': str(tournament.invite_token),
            'invite_url':   f"http://localhost:5173/join/{tournament.invite_token}",
            'invite_pin':   tournament.invite_pin,  # PIN для додаткової перевірки
        })


class VerifyInvitePinView(APIView):
    """
    POST /api/tournaments/join/{token}/verify-pin/
    Body: { "pin": "123456" }
    Публічний endpoint — перевіряє PIN без авторизації.
    Повертає { "valid": true } або 400 з помилкою.
    """
    permission_classes = []  # публічний

    def post(self, request, token):
        pin = request.data.get('pin', '').strip()

        if not pin:
            return Response(
                {'detail': 'PIN не може бути порожнім.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tournament = Tournament.objects.get(invite_token=token)
        except Tournament.DoesNotExist:
            return Response(
                {'detail': 'Невірний або недійсний інвайт-токен.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if str(tournament.invite_pin) == str(pin):
            return Response({'valid': True, 'tournament_name': tournament.name})

        return Response(
            {'detail': 'Невірний PIN-код. Перевірте та спробуйте ще раз.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


class JoinByTokenView(APIView):
    """
    POST /api/tournaments/join/
    Body: { "token": "<uuid>" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinByTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']

        try:
            tournament = Tournament.objects.get(invite_token=token)
        except Tournament.DoesNotExist:
            return Response(
                {'detail': 'Невірний або недійсний інвайт-токен.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        member, created = TournamentMember.objects.get_or_create(
            tournament=tournament,
            user=request.user,
            defaults={'role': 'participant'},
        )

        return Response({
            'tournament_id':   tournament.id,
            'tournament_name': tournament.name,
            'role':            member.role,
            'already_member':  not created,
        }, status=status.HTTP_200_OK)


class TournamentPreviewByTokenView(APIView):
    """
    GET /api/tournaments/join/{token}/preview/
    Публічний — повертає базову інфо для сторінки /join/:token.
    """
    permission_classes = []

    def get(self, request, token):
        try:
            tournament = Tournament.objects.get(invite_token=token)
        except Tournament.DoesNotExist:
            return Response(
                {'detail': 'Невірний або недійсний інвайт-токен.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'id':          tournament.id,
            'name':        tournament.name,
            'description': tournament.description,
        })


# ── TournamentMember views ────────────────────────────────────────────────────

class TournamentMemberListView(generics.ListAPIView):
    serializer_class   = TournamentMemberSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return TournamentMember.objects.filter(
            tournament_id=self.kwargs['tournament_pk']
        ).select_related('user')


class TournamentMemberDeleteView(generics.DestroyAPIView):
    serializer_class   = TournamentMemberSerializer
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get_queryset(self):
        return TournamentMember.objects.filter(
            tournament_id=self.kwargs['tournament_pk']
        )


# ── Round views ───────────────────────────────────────────────────────────────

class RoundListCreateView(generics.ListCreateAPIView):
    serializer_class   = RoundSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return Round.objects.filter(tournament_id=self.kwargs['tournament_pk'])

    def perform_create(self, serializer):
        tournament = Tournament.objects.get(pk=self.kwargs['tournament_pk'])
        serializer.save(tournament=tournament)


class RoundDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = RoundSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return Round.objects.filter(tournament_id=self.kwargs['tournament_pk'])


# ── Round links views ─────────────────────────────────────────────────────────

class RoundLinkListCreateView(generics.ListCreateAPIView):
    serializer_class   = RoundLinkSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return RoundLink.objects.filter(round_id=self.kwargs['round_pk'])

    def perform_create(self, serializer):
        round_obj = Round.objects.get(pk=self.kwargs['round_pk'])
        serializer.save(round=round_obj)


class RoundLinkDeleteView(generics.DestroyAPIView):
    serializer_class   = RoundLinkSerializer
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get_queryset(self):
        return RoundLink.objects.filter(round_id=self.kwargs['round_pk'])


# ── Round attachments views ───────────────────────────────────────────────────

class RoundAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class   = RoundAttachmentSerializer
    parser_classes     = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return RoundAttachment.objects.filter(round_id=self.kwargs['round_pk'])

    def perform_create(self, serializer):
        round_obj = Round.objects.get(pk=self.kwargs['round_pk'])
        serializer.save(round=round_obj)


class RoundAttachmentDeleteView(generics.DestroyAPIView):
    serializer_class   = RoundAttachmentSerializer
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get_queryset(self):
        return RoundAttachment.objects.filter(round_id=self.kwargs['round_pk'])


# ── Task views ────────────────────────────────────────────────────────────────

class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class   = TaskSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return Task.objects.filter(round_id=self.kwargs['round_pk'])

    def perform_create(self, serializer):
        round_obj = Round.objects.get(pk=self.kwargs['round_pk'])
        serializer.save(round=round_obj)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = TaskSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return Task.objects.filter(round_id=self.kwargs['round_pk'])


# ── Task links views ──────────────────────────────────────────────────────────

class TaskLinkListCreateView(generics.ListCreateAPIView):
    serializer_class   = TaskLinkSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return TaskLink.objects.filter(task_id=self.kwargs['task_pk'])

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        serializer.save(task=task)


class TaskLinkDeleteView(generics.DestroyAPIView):
    serializer_class   = TaskLinkSerializer
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get_queryset(self):
        return TaskLink.objects.filter(task_id=self.kwargs['task_pk'])


# ── Task attachments views ────────────────────────────────────────────────────

class TaskAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class   = TaskAttachmentSerializer
    parser_classes     = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]

    def get_queryset(self):
        return TaskAttachment.objects.filter(task_id=self.kwargs['task_pk'])

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        serializer.save(task=task)


class TaskAttachmentDeleteView(generics.DestroyAPIView):
    serializer_class   = TaskAttachmentSerializer
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get_queryset(self):
        return TaskAttachment.objects.filter(task_id=self.kwargs['task_pk'])
