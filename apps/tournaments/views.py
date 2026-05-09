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
    Grade, Team, TeamUploadPermission,
    generate_invite_pin,
)
from .serializers import (
    TournamentSerializer, TournamentMemberSerializer, JoinByTokenSerializer,
    RoundSerializer, RoundLinkSerializer, RoundAttachmentSerializer,
    TaskSerializer, TaskLinkSerializer, TaskAttachmentSerializer,
    SubmissionSerializer, SubmissionLinkSerializer, SubmissionAttachmentSerializer,
    GradeSerializer, GradeWriteSerializer, JurySubmissionSerializer,
)
from .permissions import IsTournamentOwner, IsTournamentMemberOrOwner, IsTournamentParticipant, IsTournamentJury

BASE_URL = "http://localhost:5173"

INVITABLE_ROLES = ('participant', 'jury', 'admin')

DEFAULT_CRITERIA = [
    {"key": "originality",  "label": "Оригінальність",  "max": 10},
    {"key": "execution",    "label": "Виконання",        "max": 10},
    {"key": "presentation", "label": "Презентація",      "max": 10},
]


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


# ── My role ───────────────────────────────────────────────────────────────────

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
    permission_classes = []

    def post(self, request, token):
        pin = request.data.get('pin', '').strip()
        if not pin:
            return Response({'detail': 'PIN не може бути порожнім.'}, status=status.HTTP_400_BAD_REQUEST)

        tournament, role = self._find_tournament_and_role(token)
        if not tournament:
            return Response({'detail': 'Невірний або недійсний інвайт-токен.'}, status=status.HTTP_404_NOT_FOUND)

        expected_pin = tournament.get_invite_pin_for_role(role)
        if str(expected_pin) == str(pin):
            if request.user.is_authenticated and request.user.role != role:
                ROLE_UA = {'participant': 'учасника', 'jury': 'журі', 'admin': 'адміністратора'}
                return Response({
                    'detail': (
                        f'Це посилання призначене для {ROLE_UA.get(role, role)}. '
                        f'Ваша роль у системі — «{request.user.role}». '
                        f'Зверніться до організатора, якщо вважаєте це помилкою.'
                    ),
                    'role_mismatch': True,
                    'required_role': role,
                    'user_role':     request.user.role,
                }, status=status.HTTP_403_FORBIDDEN)
            return Response({
                'valid':           True,
                'tournament_name': tournament.name,
                'role':            role,
            })

        return Response(
            {'detail': 'Невірний PIN-код. Перевірте та спробуйте ще раз.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @staticmethod
    def _find_tournament_and_role(token):
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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = JoinByTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        tournament, role = VerifyInvitePinView._find_tournament_and_role(str(token))

        if not tournament:
            return Response({'detail': 'Невірний або недійсний інвайт-токен.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != role:
            ROLE_UA = {'participant': 'учасника', 'jury': 'журі', 'admin': 'адміністратора'}
            return Response({
                'detail': (
                    f'Це посилання призначене для {ROLE_UA.get(role, role)}. '
                    f'Ваша роль у системі — «{request.user.role}». '
                    f'Зверніться до організатора, якщо вважаєте це помилкою.'
                ),
                'role_mismatch': True,
                'required_role': role,
                'user_role':     request.user.role,
            }, status=status.HTTP_403_FORBIDDEN)

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
            return Response({'detail': 'Невірний або недійсний інвайт-токен.'}, status=status.HTTP_404_NOT_FOUND)
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
    membership = TournamentMember.objects.filter(
        tournament_id=tournament_pk, user=request.user,
    ).first()
    return membership and membership.role in ('owner', 'admin', 'jury')


class SubmissionListCreateView(generics.ListCreateAPIView):
    serializer_class   = SubmissionSerializer
    permission_classes = [IsAuthenticated, IsTournamentParticipant]

    def get_queryset(self):
        base = (
            Submission.objects
            .filter(task_id=self.kwargs['task_pk'])
            .select_related('participant', 'team')
            .prefetch_related('links', 'attachments')
        )
        if _is_owner_or_staff(self.request, self.kwargs['tournament_pk']):
            return base
        return base.filter(participant=self.request.user)

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        tournament = task.round.tournament

        if tournament.tournament_type == 'team':
            team = Team.objects.filter(
                tournament=tournament, members=self.request.user
            ).first()
            if not team:
                raise ValidationError("Ви не є членом жодної команди в цьому турнірі.")
            if not team.can_upload(self.request.user):
                raise ValidationError(
                    "Тільки капітан або учасник з дозволом може завантажувати роботу."
                )
            if Submission.objects.filter(task=task, team=team).exists():
                raise ValidationError("Ваша команда вже здала роботу по цьому завданню.")
            serializer.save(task=task, participant=self.request.user, team=team)
        else:
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
            tournament = obj.task.round.tournament
            if tournament.tournament_type == 'team':
                if obj.team and not obj.team.can_upload(self.request.user):
                    raise PermissionDenied("Тільки капітан або учасник з дозволом може редагувати здачу.")
            else:
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


# ── Jury panel ────────────────────────────────────────────────────────────────

class JurySubmissionsView(APIView):
    permission_classes = [IsAuthenticated, IsTournamentJury]

    def get(self, request, tournament_pk):
        submissions = (
            Submission.objects
            .filter(task__round__tournament_id=tournament_pk)
            .select_related('task', 'task__round', 'participant', 'team')
            .prefetch_related('links', 'attachments', 'grades')
            .order_by('-submitted_at')
        )
        serializer = JurySubmissionSerializer(
            submissions, many=True, context={'request': request},
        )
        return Response({'submissions': serializer.data, 'criteria': DEFAULT_CRITERIA})


class JuryGradeView(APIView):
    permission_classes = [IsAuthenticated, IsTournamentJury]

    def post(self, request, tournament_pk, submission_pk):
        try:
            submission = (
                Submission.objects
                .select_related('task__round__tournament')
                .get(pk=submission_pk, task__round__tournament_id=tournament_pk)
            )
        except Submission.DoesNotExist:
            return Response({'detail': 'Подання не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = GradeWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        scores  = serializer.validated_data['scores']
        comment = serializer.validated_data['comment']

        for criterion in DEFAULT_CRITERIA:
            key     = criterion['key']
            max_val = criterion['max']
            val     = scores.get(key)
            if val is None:
                return Response(
                    {'detail': f'Відсутній бал для критерію «{criterion["label"]}».'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not (0 <= val <= max_val):
                return Response(
                    {'detail': f'Бал для «{criterion["label"]}» має бути від 0 до {max_val}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        grade, _ = Grade.objects.update_or_create(
            submission=submission,
            juror=request.user,
            defaults={'scores': scores, 'comment': comment, 'total': sum(scores.values())},
        )

        return Response({
            'id': grade.id, 'scores': grade.scores,
            'comment': grade.comment, 'total': grade.total,
            'updated_at': grade.updated_at,
        }, status=status.HTTP_200_OK)


class SubmissionGradeView(APIView):
    permission_classes = [IsAuthenticated, IsTournamentParticipant]

    def get(self, request, tournament_pk, round_pk, task_pk, submission_pk):
        try:
            submission = Submission.objects.get(
                pk=submission_pk, task_id=task_pk,
                task__round_id=round_pk, task__round__tournament_id=tournament_pk,
            )
        except Submission.DoesNotExist:
            return Response({'detail': 'Подання не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        membership = TournamentMember.objects.filter(
            tournament_id=tournament_pk, user=request.user,
        ).first()
        is_privileged = membership and membership.role in ('owner', 'admin', 'jury')

        if not is_privileged and submission.participant != request.user:
            return Response({'detail': 'Доступ заборонено.'}, status=status.HTTP_403_FORBIDDEN)

        grades = submission.grades.all().select_related('juror')
        if not grades.exists():
            return Response(None, status=status.HTTP_200_OK)

        all_scores = {}
        for grade in grades:
            for key, val in (grade.scores or {}).items():
                all_scores.setdefault(key, []).append(float(val))

        avg_scores = {k: round(sum(v) / len(v), 1) for k, v in all_scores.items()}
        avg_total  = round(sum(g.total for g in grades) / len(grades), 1)
        comments   = [g.comment for g in grades if g.comment]

        criteria_labels = {c["key"]: c["label"] for c in DEFAULT_CRITERIA}
        criteria_max    = {c["key"]: c["max"]   for c in DEFAULT_CRITERIA}
        max_total       = sum(c["max"] for c in DEFAULT_CRITERIA)
        latest_grade    = grades.order_by('-updated_at').first()

        return Response({
            'scores':       avg_scores,
            'total':        avg_total,
            'max_total':    max_total,
            'comment':      comments[0] if comments else "",
            'criteria':     criteria_labels,
            'criteria_max': criteria_max,
            'updated_at':   latest_grade.updated_at if latest_grade else None,
            'grades_count': grades.count(),
        })


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated, IsTournamentParticipant]

    def _get_tournament_and_membership(self, request, tournament_pk):
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return None, None, None
        membership = TournamentMember.objects.filter(
            tournament=tournament, user=request.user,
        ).first()
        return tournament, membership, membership.role if membership else None

    def get(self, request, tournament_pk):
        tournament, membership, role = self._get_tournament_and_membership(request, tournament_pk)
        if not tournament or not membership:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        is_privileged = role in ('owner', 'admin')
        if not is_privileged and not tournament.leaderboard_published:
            return Response({'detail': 'Таблиця лідерів ще не опублікована.'}, status=403)

        grades = (
            Grade.objects
            .filter(submission__task__round__tournament=tournament)
            .select_related(
                'submission__participant',
                'submission__task__round',
                'submission__team',
            )
        )

        if tournament.tournament_type == 'team':
            data  = {}
            names = {}
            for grade in grades:
                sub  = grade.submission
                team = sub.team
                if not team:
                    continue
                tid = team.id
                rid = sub.task.round_id
                if tid not in data:
                    names[tid] = team.name
                    data[tid]  = {}
                data[tid].setdefault(rid, []).append(grade.total)

            participants = []
            for tid, round_data in data.items():
                round_scores = {}
                total = 0
                for rid, totals in round_data.items():
                    avg = round(sum(totals) / len(totals), 1)
                    round_scores[str(rid)] = avg
                    total += avg
                participants.append({
                    'team_id':      tid,
                    'team_name':    names[tid],
                    'round_scores': round_scores,
                    'total':        round(total, 1),
                })
        else:
            data  = {}
            names = {}
            for grade in grades:
                sub         = grade.submission
                participant = sub.participant
                pid         = participant.id
                rid         = sub.task.round_id
                if pid not in data:
                    full_name = f"{participant.first_name} {participant.last_name}".strip()
                    names[pid] = full_name or participant.username or f"Учасник #{pid}"
                    data[pid]  = {}
                data[pid].setdefault(rid, []).append(grade.total)

            participants = []
            for pid, round_data in data.items():
                round_scores = {}
                total = 0
                for rid, totals in round_data.items():
                    avg = round(sum(totals) / len(totals), 1)
                    round_scores[str(rid)] = avg
                    total += avg
                participants.append({
                    'participant_id':   pid,
                    'participant_name': names[pid],
                    'round_scores':     round_scores,
                    'total':            round(total, 1),
                })

        return Response({
            'is_published':    tournament.leaderboard_published,
            'tournament_type': tournament.tournament_type,
            'participants':    participants,
        })

    def patch(self, request, tournament_pk):
        tournament, membership, role = self._get_tournament_and_membership(request, tournament_pk)
        if not tournament or not membership:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)
        if role not in ('owner', 'admin'):
            return Response({'detail': 'Тільки власник або адміністратор може керувати публікацією.'}, status=403)

        is_published = request.data.get('is_published')
        if not isinstance(is_published, bool):
            return Response({'detail': 'Поле is_published має бути булевим.'}, status=400)

        tournament.leaderboard_published = is_published
        tournament.save(update_fields=['leaderboard_published'])
        return Response({'is_published': tournament.leaderboard_published})


# ── Participant grades news ───────────────────────────────────────────────────

class ParticipantGradesNewsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        grades = (
            Grade.objects
            .filter(submission__participant=request.user)
            .select_related(
                'juror',
                'submission__task',
                'submission__task__round',
                'submission__task__round__tournament',
            )
            .order_by('-updated_at')
        )

        result = []
        for grade in grades:
            sub        = grade.submission
            task       = sub.task
            round_     = task.round
            tournament = round_.tournament

            criteria_list = [{"key": c["key"], "label": c["label"], "max": c["max"]} for c in DEFAULT_CRITERIA]
            max_total = sum(c["max"] for c in DEFAULT_CRITERIA)

            jury = grade.juror
            jury_name = f"{jury.first_name} {jury.last_name}".strip() or jury.username

            result.append({
                "id":           grade.id,
                "task_title":   task.title,
                "round_title":  round_.title,
                "tournament":   tournament.name,
                "jury_name":    jury_name,
                "criteria":     criteria_list,
                "scores":       grade.scores or {},
                "total":        grade.total,
                "max_total":    max_total,
                "comment":      grade.comment or "",
                "graded_at":    grade.updated_at,
                "read":         False,
            })

        return Response(result, status=status.HTTP_200_OK)
