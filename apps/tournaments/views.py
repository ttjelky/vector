from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied

from .models import (
    Tournament, TournamentMember,
    Round, RoundLink, RoundAttachment,
    Task, TaskLink, TaskAttachment,
    Submission, SubmissionLink, SubmissionAttachment,
    generate_invite_pin,
)
from .serializers import (
    TournamentSerializer, TournamentMemberSerializer, JoinByTokenSerializer,
    RoundSerializer, RoundLinkSerializer, RoundAttachmentSerializer,
    TaskSerializer, TaskLinkSerializer, TaskAttachmentSerializer,
    SubmissionSerializer, SubmissionLinkSerializer, SubmissionAttachmentSerializer,
)
from .permissions import IsTournamentOwner, IsTournamentMemberOrOwner, IsTournamentParticipant

BASE_URL = "http://localhost:5173"

# Ролі, для яких власник може генерувати інвайти
INVITABLE_ROLES = ('participant', 'jury', 'admin')


# ── Tournament views ──────────────────────────────────────────────────────────

class TournamentCreateView(generics.ListCreateAPIView):
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
    queryset           = Tournament.objects.all()
    serializer_class   = TournamentSerializer
    permission_classes = [IsAuthenticated, IsTournamentMemberOrOwner]


# ── My role in tournament ─────────────────────────────────────────────────────

class MyTournamentRoleView(APIView):
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
    GET /tournaments/<id>/invite-link/?role=participant|jury|admin
    Повертає invite_url і invite_pin для вказаної ролі.
    Доступно тільки власнику.
    """
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def get(self, request, tournament_pk):
        role = request.query_params.get('role', 'participant')
        if role not in INVITABLE_ROLES:
            return Response(
                {'detail': f'Невірна роль. Допустимі: {", ".join(INVITABLE_ROLES)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        token = tournament.get_invite_token_for_role(role)
        pin   = tournament.get_invite_pin_for_role(role)

        return Response({
            'role':         role,
            'invite_token': str(token),
            'invite_url':   f"{BASE_URL}/join/{token}",
            'invite_pin':   pin,
        })


class RegeneratePinView(APIView):
    """
    POST /tournaments/<id>/regenerate-pin/?role=participant|jury|admin
    Перегенерує PIN для вказаної ролі.
    """
    permission_classes = [IsAuthenticated, IsTournamentOwner]

    def post(self, request, tournament_pk):
        role = request.query_params.get('role', 'participant')
        if role not in INVITABLE_ROLES:
            return Response(
                {'detail': f'Невірна роль. Допустимі: {", ".join(INVITABLE_ROLES)}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        new_pin = tournament.set_invite_pin_for_role(role)
        return Response({'role': role, 'invite_pin': new_pin})


class VerifyInvitePinView(APIView):
    """
    POST /tournaments/join/<token>/verify-pin/
    Токен однозначно визначає роль — просто перевіряємо PIN.
    """
    permission_classes = []

    def post(self, request, token):
        pin = request.data.get('pin', '').strip()
        if not pin:
            return Response(
                {'detail': 'PIN не може бути порожнім.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tournament, role = self._find_tournament_and_role(token)
        if not tournament:
            return Response(
                {'detail': 'Невірний або недійсний інвайт-токен.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        expected_pin = tournament.get_invite_pin_for_role(role)
        if str(expected_pin) == str(pin):
            return Response({
                'valid':            True,
                'tournament_name':  tournament.name,
                'role':             role,
            })

        return Response(
            {'detail': 'Невірний PIN-код. Перевірте та спробуйте ще раз.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @staticmethod
    def _find_tournament_and_role(token):
        """Шукає турнір за токеном будь-якої ролі, повертає (tournament, role)."""
        for field, role in [
            ('invite_token',       'participant'),
            ('jury_invite_token',  'jury'),
            ('admin_invite_token', 'admin'),
        ]:
            try:
                t = Tournament.objects.get(**{field: token})
                return t, role
            except Tournament.DoesNotExist:
                continue
        return None, None


class JoinByTokenView(APIView):
    """
    POST /tournaments/join/
    Body: { "token": "<uuid>" }
    Визначає роль з токена і додає користувача з відповідною роллю.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinByTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        tournament, role = VerifyInvitePinView._find_tournament_and_role(str(token))

        if not tournament:
            return Response(
                {'detail': 'Невірний або недійсний інвайт-токен.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        member, created = TournamentMember.objects.get_or_create(
            tournament=tournament,
            user=request.user,
            defaults={'role': role},
        )

        return Response({
            'tournament_id':   tournament.id,
            'tournament_name': tournament.name,
            'role':            member.role,
            'already_member':  not created,
        }, status=status.HTTP_200_OK)


class TournamentPreviewByTokenView(APIView):
    permission_classes = []

    def get(self, request, token):
        tournament, role = VerifyInvitePinView._find_tournament_and_role(str(token))
        if not tournament:
            return Response(
                {'detail': 'Невірний або недійсний інвайт-токен.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'id':          tournament.id,
            'name':        tournament.name,
            'description': tournament.description,
            'role':        role,
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


# ── Round links ───────────────────────────────────────────────────────────────

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


# ── Round attachments ─────────────────────────────────────────────────────────

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


# ── Tasks ─────────────────────────────────────────────────────────────────────

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


# ── Task links ────────────────────────────────────────────────────────────────

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


# ── Task attachments ──────────────────────────────────────────────────────────

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


# ── Submissions ───────────────────────────────────────────────────────────────

def _is_owner_or_staff(request, tournament_pk):
    """Повертає True якщо юзер є власником турніру або має роль admin/jury."""
    membership = TournamentMember.objects.filter(
        tournament_id=tournament_pk,
        user=request.user,
    ).first()
    return membership and membership.role in ('owner', 'admin', 'jury')


class SubmissionListCreateView(generics.ListCreateAPIView):
    serializer_class   = SubmissionSerializer
    permission_classes = [IsAuthenticated, IsTournamentParticipant]

    def get_queryset(self):
        base = (
            Submission.objects
            .filter(task_id=self.kwargs['task_pk'])
            .select_related('participant')
            .prefetch_related('links', 'attachments')
        )
        if _is_owner_or_staff(self.request, self.kwargs['tournament_pk']):
            return base
        return base.filter(participant=self.request.user)

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        if Submission.objects.filter(task=task, participant=self.request.user).exists():
            raise ValidationError("Ви вже здали роботу по цьому завданню.")
        serializer.save(task=task, participant=self.request.user)


class SubmissionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = SubmissionSerializer
    permission_classes = [IsAuthenticated, IsTournamentParticipant]

    def get_queryset(self):
        return Submission.objects.filter(task_id=self.kwargs['task_pk'])

    def get_object(self):
        obj = super().get_object()
        if self.request.method in ('PATCH', 'PUT', 'DELETE'):
            if obj.participant != self.request.user:
                raise PermissionDenied("Ви можете редагувати лише свою здачу.")
        return obj


class SubmissionLinkCreateView(generics.CreateAPIView):
    serializer_class   = SubmissionLinkSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        submission = Submission.objects.get(pk=self.kwargs['submission_pk'])
        if submission.participant != self.request.user:
            raise PermissionDenied("Ви можете редагувати лише свою здачу.")
        serializer.save(submission=submission)


class SubmissionLinkDeleteView(generics.DestroyAPIView):
    serializer_class   = SubmissionLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SubmissionLink.objects.filter(submission_id=self.kwargs['submission_pk'])

    def get_object(self):
        obj = super().get_object()
        if obj.submission.participant != self.request.user:
            raise PermissionDenied("Ви можете редагувати лише свою здачу.")
        return obj


class SubmissionAttachmentCreateView(generics.CreateAPIView):
    serializer_class   = SubmissionAttachmentSerializer
    parser_classes     = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        submission = Submission.objects.get(pk=self.kwargs['submission_pk'])
        if submission.participant != self.request.user:
            raise PermissionDenied("Ви можете редагувати лише свою здачу.")
        serializer.save(submission=submission)


class SubmissionAttachmentDeleteView(generics.DestroyAPIView):
    serializer_class   = SubmissionAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SubmissionAttachment.objects.filter(submission_id=self.kwargs['submission_pk'])

    def get_object(self):
        obj = super().get_object()
        if obj.submission.participant != self.request.user:
            raise PermissionDenied("Ви можете редагувати лише свою здачу.")
        return obj
