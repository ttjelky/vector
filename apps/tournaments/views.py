import random
from collections import defaultdict

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
    Grade, Team, TeamUploadPermission, JuryAssignment,
    generate_invite_pin,
    Announcement, AnnouncementComment, AnnouncementReaction,
)
from .serializers import (
    TournamentSerializer, TournamentMemberSerializer, JoinByTokenSerializer,
    RoundSerializer, RoundLinkSerializer, RoundAttachmentSerializer,
    TaskSerializer, TaskLinkSerializer, TaskAttachmentSerializer,
    SubmissionSerializer, SubmissionLinkSerializer, SubmissionAttachmentSerializer,
    GradeSerializer, GradeWriteSerializer, JurySubmissionSerializer,
    JuryAssignmentSerializer,
    AnnouncementSerializer, AnnouncementCommentSerializer,
)
from .permissions import IsTournamentOwner, IsTournamentMemberOrOwner, IsTournamentParticipant, IsTournamentJury

BASE_URL = "http://localhost:5173"

INVITABLE_ROLES = ('participant', 'jury', 'admin')

# ── Критерії оцінювання ───────────────────────────────────────────────────────
#
# Шкала: 0–10 балів по кожному з 6 критеріїв.
# Максимум: 60 балів.
# Формула підсумку: sum(scores.values())  — проста сума без ваг.
#
# Групи:
#   I.  Технічна частина   (backend_quality, database, frontend_quality)
#   II. Функціональність   (must_have_completion, stability, usability)
#
DEFAULT_CRITERIA = [
    # ── I. Технічна частина ───────────────────────────────────────────────────
    {
        "key":   "backend_quality",
        "label": "Backend якість коду",
        "hint":  "Clean code, патерни, ООП, відсутність помилок, тести",
        "max":   10,
        "group": "Технічна частина",
    },
    {
        "key":   "database",
        "label": "Database",
        "hint":  "Наявність і налаштування БД, структура схеми",
        "max":   10,
        "group": "Технічна частина",
    },
    {
        "key":   "frontend_quality",
        "label": "Frontend якість та UX/UI",
        "hint":  "Clean code, патерни, відсутність помилок, тести, зручний інтерфейс",
        "max":   10,
        "group": "Технічна частина",
    },
    # ── II. Функціональність ──────────────────────────────────────────────────
    {
        "key":   "must_have_completion",
        "label": "Виконання вимог завдання",
        "hint":  "Наскільки повно реалізовані всі must-have вимоги",
        "max":   10,
        "group": "Функціональність",
    },
    {
        "key":   "stability",
        "label": "Роботоздатність та відсутність багів",
        "hint":  "Проєкт стабільно запускається та працює без критичних помилок",
        "max":   10,
        "group": "Функціональність",
    },
    {
        "key":   "usability",
        "label": "Зручність використання",
        "hint":  "Наскільки легко та інтуїтивно користуватись продуктом",
        "max":   10,
        "group": "Функціональність",
    },
]

MAX_TOTAL = sum(c["max"] for c in DEFAULT_CRITERIA)  # 60


# ── Internal helpers ──────────────────────────────────────────────────────────

def _is_owner_or_staff(request, tournament_pk):
    """Повертає True якщо юзер є власником турніру або має роль admin/jury."""
    membership = TournamentMember.objects.filter(
        tournament_id=tournament_pk,
        user=request.user,
    ).first()
    return membership and membership.role in ('owner', 'admin', 'jury')


def _get_membership_role(request, tournament_pk):
    """Повертає роль поточного юзера в турнірі або None."""
    m = TournamentMember.objects.filter(
        tournament_id=tournament_pk,
        user=request.user,
    ).first()
    return m.role if m else None


def _run_distribution(tournament_id, min_reviews: int, max_per_juror: int) -> list[JuryAssignment]:
    """
    Рандомний розподіл подань між членами журі.

    Алгоритм:
      1. Збираємо всі подання турніру та всіх членів з роллю 'jury'.
      2. Перевіряємо здійсненність: total_slots <= max_capacity і min_reviews <= len(jurors).
      3. Ітеруємось по перемішаних поданнях; для кожного обираємо min_reviews
         журі з найменшим поточним навантаженням (з невеличкою випадковістю).
      4. Повертаємо список створених об'єктів JuryAssignment.

    Raises:
      ValueError — якщо вхідні дані невалідні або розподіл неможливий.
    """
    submissions = list(
        Submission.objects
        .filter(task__round__tournament_id=tournament_id)
        .select_related('task__round')
    )
    if not submissions:
        raise ValueError("У турнірі ще немає жодного поданого завдання.")

    juror_ids = list(
        TournamentMember.objects
        .filter(tournament_id=tournament_id, role='jury')
        .values_list('user_id', flat=True)
    )
    if not juror_ids:
        raise ValueError("У турнірі ще немає жодного члена журі.")

    if min_reviews < 1:
        raise ValueError("min_reviews має бути не менше 1.")
    if max_per_juror < 1:
        raise ValueError("max_per_juror має бути не менше 1.")
    if min_reviews > len(juror_ids):
        raise ValueError(
            f"min_reviews ({min_reviews}) більше ніж кількість журі ({len(juror_ids)}). "
            f"Зменшіть min_reviews або додайте більше членів журі."
        )

    total_slots   = len(submissions) * min_reviews
    max_capacity  = len(juror_ids) * max_per_juror
    if total_slots > max_capacity:
        raise ValueError(
            f"Недостатня місткість журі: потрібно {total_slots} слотів "
            f"({len(submissions)} робіт × {min_reviews} рецензентів), "
            f"але максимум журі може взяти {max_capacity} "
            f"({len(juror_ids)} журі × {max_per_juror} робіт)."
        )

    # Перемішуємо для рандомності
    random.shuffle(submissions)
    random.shuffle(juror_ids)

    juror_load = defaultdict(int)           # juror_id → кількість поточних призначень
    sub_jurors: dict[int, set] = defaultdict(set)  # submission_id → множина juror_id

    new_assignments = []

    for sub in submissions:
        # Доступні журі: ще не призначені на цю роботу + не перевищили ліміт
        available = [
            j for j in juror_ids
            if j not in sub_jurors[sub.id] and juror_load[j] < max_per_juror
        ]

        if len(available) < min_reviews:
            raise ValueError(
                f"Неможливо призначити {min_reviews} журі для подання #{sub.id} "
                f"(«{sub.task.title}»): вільно лише {len(available)} з {len(juror_ids)} журі."
            )

        # Сортуємо за навантаженням; беремо pool з найменш завантажених + перемішуємо
        available.sort(key=lambda j: juror_load[j])
        pool_size = min(min_reviews * 2, len(available))
        pool = available[:pool_size]
        random.shuffle(pool)
        selected = pool[:min_reviews]

        for juror_id in selected:
            juror_load[juror_id] += 1
            sub_jurors[sub.id].add(juror_id)
            new_assignments.append(
                JuryAssignment(
                    tournament_id=tournament_id,
                    juror_id=juror_id,
                    submission=sub,
                )
            )

    JuryAssignment.objects.bulk_create(new_assignments, ignore_conflicts=True)

    return new_assignments


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
                ROLE_UA = {
                    'participant': 'учасника',
                    'jury':        'журі',
                    'admin':       'адміністратора',
                }
                return Response(
                    {
                        'detail': (
                            f'Це посилання призначене для {ROLE_UA.get(role, role)}. '
                            f'Ваша роль у системі — «{request.user.role}». '
                            f'Зверніться до організатора, якщо вважаєте це помилкою.'
                        ),
                        'role_mismatch': True,
                        'required_role': role,
                        'user_role':     request.user.role,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Для учасників перевіряємо чи відкрита реєстрація
            if role == 'participant':
                already = (
                    request.user.is_authenticated and
                    TournamentMember.objects.filter(
                        tournament=tournament, user=request.user
                    ).exists()
                )
                if not already and not tournament.registration_open():
                    return Response(
                        {'detail': 'Реєстрація учасників зараз закрита.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )

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

        # Перевірка реєстрації для учасників
        if role == 'participant':
            already = TournamentMember.objects.filter(
                tournament=tournament, user=request.user
            ).exists()
            if not already and not tournament.registration_open():
                return Response(
                    {'detail': 'Реєстрація учасників зараз закрита.'},
                    status=status.HTTP_403_FORBIDDEN,
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


class LeaveTournamentView(APIView):
    """DELETE /tournaments/<tournament_pk>/leave/ — вихід з турніру для учасника або журі."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, tournament_pk):
        membership = TournamentMember.objects.filter(
            tournament_id=tournament_pk,
            user=request.user,
        ).first()

        if not membership:
            return Response({"detail": "Ви не є учасником цього турніру."}, status=404)

        if membership.role == "owner":
            return Response({"detail": "Власник не може покинути турнір."}, status=403)

        membership.delete()
        return Response(status=204)


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

        # Для командного турніру — показуємо здачу команди всім її учасникам
        task_obj = Task.objects.select_related('round__tournament').get(
            pk=self.kwargs['task_pk']
        )
        if task_obj.round.tournament.tournament_type == 'team':
            from .models import TeamMember
            # Шукаємо команду юзера (капітан або учасник)
            team = Team.objects.filter(
                tournament=task_obj.round.tournament, captain=self.request.user
            ).first()
            if not team:
                membership = TeamMember.objects.filter(
                    team__tournament=task_obj.round.tournament,
                    user=self.request.user,
                    status=TeamMember.STATUS_ACCEPTED,
                ).select_related('team').first()
                team = membership.team if membership else None
            if team:
                return base.filter(team=team)
            return base.none()

        return base.filter(participant=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        data = []
        for item, obj in zip(serializer.data, queryset):
            item = dict(item)
            item['participant_username'] = obj.participant.get_full_name() or obj.participant.username
            item['participant_email']    = obj.participant.email
            if obj.team:
                item['team_name'] = obj.team.name
            data.append(item)
        return Response(data)

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        tournament = task.round.tournament

        if tournament.tournament_type == 'team':
            from .models import TeamMember
            # Спочатку шукаємо як капітан
            team = Team.objects.filter(
                tournament=tournament, captain=self.request.user
            ).first()
            # Якщо не капітан — шукаємо як прийнятий учасник
            if not team:
                membership = TeamMember.objects.filter(
                    team__tournament=tournament,
                    user=self.request.user,
                    status=TeamMember.STATUS_ACCEPTED,
                ).select_related('team').first()
                team = membership.team if membership else None

            if not team:
                raise ValidationError("Ви не є членом жодної команди в цьому турнірі.")

            # Тільки капітан може здавати роботу
            if team.captain_id != self.request.user.pk:
                raise ValidationError("Тільки капітан команди може здавати роботу.")

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
                # Редагувати може тільки капітан
                if not obj.team or obj.team.captain_id != self.request.user.pk:
                    raise PermissionDenied("Тільки капітан команди може редагувати здачу.")
            else:
                if obj.participant != self.request.user:
                    raise PermissionDenied("Ви можете редагувати лише свою здачу.")
        elif self.request.method == 'GET':
            # GET: перевіряємо що юзер є учасником цієї команди або капітаном
            tournament = obj.task.round.tournament
            if tournament.tournament_type == 'team' and obj.team:
                from .models import TeamMember
                is_captain = obj.team.captain_id == self.request.user.pk
                is_member  = TeamMember.objects.filter(
                    team=obj.team,
                    user=self.request.user,
                    status=TeamMember.STATUS_ACCEPTED,
                ).exists()
                if not is_captain and not is_member and not _is_owner_or_staff(self.request, tournament.pk):
                    raise PermissionDenied("Ви не є учасником цієї команди.")
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
    """
    GET /tournaments/<tournament_pk>/jury/submissions/

    Поведінка залежить від ролі:
      — jury:        бачить тільки подання, призначені йому через JuryAssignment.
      — owner/admin: бачить усі подання турніру (для контролю та оцінювання).

    Відповідь:
    {
      "submissions": [...],
      "criteria":    [...],   # DEFAULT_CRITERIA з group/hint
      "max_total":   60,
      "has_assignments": bool  # чи вже проводився розподіл
    }
    """
    permission_classes = [IsAuthenticated, IsTournamentJury]

    def get(self, request, tournament_pk):
        role = _get_membership_role(request, tournament_pk)
        is_privileged = role in ('owner', 'admin')

        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        is_team = tournament.tournament_type == 'team'

        base_qs = (
            Submission.objects
            .select_related('task', 'task__round', 'participant', 'team')
            .prefetch_related('links', 'attachments', 'grades', 'jury_assignments')
            .order_by('-submitted_at')
        )

        if is_privileged:
            submissions = base_qs.filter(task__round__tournament_id=tournament_pk)
        else:
            submissions = base_qs.filter(
                jury_assignments__juror=request.user,
                jury_assignments__tournament_id=tournament_pk,
            ).distinct()

        has_assignments = JuryAssignment.objects.filter(
            tournament_id=tournament_pk
        ).exists()

        serializer = JurySubmissionSerializer(
            submissions, many=True, context={'request': request},
        )

        # Для командного турніру — підміняємо author_name на назву команди
        subs_data = list(serializer.data)
        if is_team:
            sub_map = {s.id: s for s in submissions}
            subs_data = []
            for item in serializer.data:
                item = dict(item)
                sub_obj = sub_map.get(item.get('id'))
                if sub_obj and sub_obj.team:
                    item['team_name']   = sub_obj.team.name
                    item['author_name'] = sub_obj.team.name
                subs_data.append(item)

        return Response({
            'submissions':     subs_data,
            'criteria':        DEFAULT_CRITERIA,
            'max_total':       MAX_TOTAL,
            'has_assignments': has_assignments,
            'is_team':         is_team,
        })


class JuryGradeView(APIView):
    """
    POST /tournaments/<tournament_pk>/jury/submissions/<submission_pk>/grade/

    Створює або оновлює оцінку журі для вказаного подання.

    Body:
    {
      "scores": {
        "backend_quality": 8,
        "database": 7,
        "frontend_quality": 9,
        "must_have_completion": 10,
        "stability": 8,
        "usability": 7
      },
      "comment": "Гарна робота, але..."
    }

    Обмеження для ролі 'jury':
      — журі може оцінювати тільки призначені йому роботи.
      — owner/admin можуть оцінювати будь-яке подання турніру.

    Підсумковий бал = сума всіх scores (max 60).
    """
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

        # Журі може оцінювати тільки призначені роботи
        role = _get_membership_role(request, tournament_pk)
        if role == 'jury':
            assigned = JuryAssignment.objects.filter(
                tournament_id=tournament_pk,
                juror=request.user,
                submission=submission,
            ).exists()
            if not assigned:
                return Response(
                    {'detail': 'Ця робота не призначена вам для оцінювання.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

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

        total = sum(scores.values())

        grade, _ = Grade.objects.update_or_create(
            submission=submission,
            juror=request.user,
            defaults={
                'scores':  scores,
                'comment': comment,
                'total':   total,
            },
        )

        return Response({
            'id':         grade.id,
            'scores':     grade.scores,
            'comment':    grade.comment,
            'total':      grade.total,
            'max_total':  MAX_TOTAL,
            'updated_at': grade.updated_at,
        }, status=status.HTTP_200_OK)


# ── Jury assignment views ─────────────────────────────────────────────────────

class DistributeSubmissionsView(APIView):
    """
    POST /tournaments/<tournament_pk>/jury/distribute/

    Рандомний розподіл подань між членами журі (роль 'jury').
    Доступно тільки owner та admin.

    Body (все опціонально):
    {
      "min_reviews":  2,      # мінімум журі на одну роботу (default: 2)
      "max_per_juror": 5,     # максимум робіт на одного журі (default: 5)
      "reset": true           # видалити поточний розподіл перед новим (default: false)
    }

    Відповідь:
    {
      "assignments_created": N,
      "juror_summary": [
        {"juror_id": X, "username": "...", "assigned_count": 3},
        ...
      ],
      "submission_coverage": [
        {"submission_id": Y, "reviewers": 2},
        ...
      ]
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk):
        role = _get_membership_role(request, tournament_pk)
        if role not in ('owner', 'admin'):
            return Response(
                {'detail': 'Тільки власник або адміністратор може запустити розподіл.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=status.HTTP_404_NOT_FOUND)

        min_reviews  = int(request.data.get('min_reviews',  2))
        max_per_juror = int(request.data.get('max_per_juror', 5))
        reset         = bool(request.data.get('reset', False))

        if reset:
            JuryAssignment.objects.filter(tournament=tournament).delete()

        try:
            new_assignments = _run_distribution(tournament_pk, min_reviews, max_per_juror)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Формуємо summary по журі
        juror_counts: dict[int, int] = defaultdict(int)
        for a in new_assignments:
            juror_counts[a.juror_id] += 1

        from apps.users.models import User
        juror_ids = list(juror_counts.keys())
        jurors = {u.id: u for u in User.objects.filter(id__in=juror_ids)}

        juror_summary = [
            {
                'juror_id':      jid,
                'username':      jurors[jid].username if jid in jurors else str(jid),
                'assigned_count': cnt,
            }
            for jid, cnt in sorted(juror_counts.items(), key=lambda x: -x[1])
        ]

        # Coverage по поданнях
        sub_counts: dict[int, int] = defaultdict(int)
        for a in new_assignments:
            sub_counts[a.submission_id] += 1

        submission_coverage = [
            {'submission_id': sid, 'reviewers': cnt}
            for sid, cnt in sub_counts.items()
        ]

        return Response({
            'assignments_created': len(new_assignments),
            'juror_summary':       juror_summary,
            'submission_coverage': submission_coverage,
        }, status=status.HTTP_201_CREATED)


class JuryAssignmentListView(APIView):
    """
    GET /tournaments/<tournament_pk>/jury/assignments/

    Повертає всі призначення турніру.
    Доступно тільки owner та admin.

    Query params:
      ?juror_id=<id>      — фільтр по журі
      ?submission_id=<id> — фільтр по поданню
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        role = _get_membership_role(request, tournament_pk)
        if role not in ('owner', 'admin'):
            return Response(
                {'detail': 'Тільки власник або адміністратор може переглядати призначення.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = (
            JuryAssignment.objects
            .filter(tournament_id=tournament_pk)
            .select_related('juror', 'submission__task__round')
            .order_by('juror__username', 'assigned_at')
        )

        juror_id = request.query_params.get('juror_id')
        if juror_id:
            qs = qs.filter(juror_id=juror_id)

        submission_id = request.query_params.get('submission_id')
        if submission_id:
            qs = qs.filter(submission_id=submission_id)

        serializer = JuryAssignmentSerializer(qs, many=True)
        return Response(serializer.data)


class JuryAssignmentCreateView(APIView):
    """
    POST /tournaments/<tournament_pk>/jury/assignments/

    Ручне призначення конкретного подання конкретному журі.
    Доступно тільки owner та admin.

    Body: { "juror_id": <int>, "submission_id": <int> }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk):
        role = _get_membership_role(request, tournament_pk)
        if role not in ('owner', 'admin'):
            return Response(
                {'detail': 'Тільки власник або адміністратор може призначати роботи.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        juror_id      = request.data.get('juror_id')
        submission_id = request.data.get('submission_id')

        if not juror_id or not submission_id:
            return Response(
                {'detail': 'Потрібні поля juror_id та submission_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Перевірка що журі належить до турніру
        jury_member = TournamentMember.objects.filter(
            tournament_id=tournament_pk,
            user_id=juror_id,
            role__in=('jury', 'owner', 'admin'),
        ).first()
        if not jury_member:
            return Response(
                {'detail': 'Вказаний користувач не є членом журі цього турніру.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Перевірка що подання належить до турніру
        submission = Submission.objects.filter(
            pk=submission_id,
            task__round__tournament_id=tournament_pk,
        ).first()
        if not submission:
            return Response(
                {'detail': 'Подання не знайдено в цьому турнірі.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        assignment, created = JuryAssignment.objects.get_or_create(
            tournament_id=tournament_pk,
            juror_id=juror_id,
            submission=submission,
        )

        serializer = JuryAssignmentSerializer(assignment)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class JuryAssignmentDeleteView(generics.DestroyAPIView):
    """
    DELETE /tournaments/<tournament_pk>/jury/assignments/<pk>/

    Видаляє конкретне призначення (ручне скасування).
    Доступно тільки owner та admin.
    """
    serializer_class   = JuryAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        role = _get_membership_role(self.request, self.kwargs['tournament_pk'])
        if role not in ('owner', 'admin'):
            return JuryAssignment.objects.none()
        return JuryAssignment.objects.filter(tournament_id=self.kwargs['tournament_pk'])

    def destroy(self, request, *args, **kwargs):
        role = _get_membership_role(request, kwargs['tournament_pk'])
        if role not in ('owner', 'admin'):
            return Response(
                {'detail': 'Тільки власник або адміністратор може видаляти призначення.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


# ── Submission grades view ────────────────────────────────────────────────────

class SubmissionGradeView(APIView):
    """
    GET /tournaments/<tournament_pk>/rounds/<round_pk>/tasks/<task_pk>/submissions/<submission_pk>/grade/

    Повертає агреговану оцінку для конкретного подання.
    Учасник бачить середній бал і перший коментар від журі.
    Власник / адмін бачать всі оцінки від усіх журі.
    """
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

        # Агрегація балів
        all_scores: dict[str, list] = {}
        for grade in grades:
            for key, val in (grade.scores or {}).items():
                all_scores.setdefault(key, []).append(float(val))

        avg_scores = {k: round(sum(v) / len(v), 1) for k, v in all_scores.items()}
        avg_total  = round(sum(g.total for g in grades) / len(grades), 1)

        comments = [g.comment for g in grades if g.comment]

        criteria_labels = {c["key"]: c["label"] for c in DEFAULT_CRITERIA}
        criteria_max    = {c["key"]: c["max"]   for c in DEFAULT_CRITERIA}

        latest_grade = grades.order_by('-updated_at').first()

        return Response({
            'scores':       avg_scores,
            'total':        avg_total,
            'max_total':    MAX_TOTAL,
            'comment':      comments[0] if comments else "",
            'criteria':     criteria_labels,
            'criteria_max': criteria_max,
            'updated_at':   latest_grade.updated_at if latest_grade else None,
            'grades_count': grades.count(),
        })


# ── Registration exception view ───────────────────────────────────────────────

class RegistrationExceptionView(APIView):
    """
    GET  /tournaments/<pk>/registration-exception/
    POST /tournaments/<pk>/registration-exception/
         Body: { "minutes": 15|30|60 } або { "minutes": 0 } для скасування.
    Доступно owner/admin.
    """
    permission_classes = [IsAuthenticated]

    def _get_tournament_and_role(self, request, pk):
        try:
            t = Tournament.objects.get(pk=pk)
        except Tournament.DoesNotExist:
            return None, None
        m = TournamentMember.objects.filter(tournament=t, user=request.user).first()
        return t, (m.role if m else None)

    def get(self, request, tournament_pk):
        from django.utils import timezone
        tournament, role = self._get_tournament_and_role(request, tournament_pk)
        if not tournament:
            return Response({'detail': 'Турнір не знайдено.'}, status=status.HTTP_404_NOT_FOUND)
        if role not in ('owner', 'admin'):
            return Response({'detail': 'Доступ заборонено.'}, status=status.HTTP_403_FORBIDDEN)

        until = tournament.registration_exception_until
        now = timezone.now()
        is_active = bool(until and until > now)
        return Response({
            'is_active': is_active,
            'until':     until.isoformat() if is_active else None,
        })

    def post(self, request, tournament_pk):
        from django.utils import timezone
        tournament, role = self._get_tournament_and_role(request, tournament_pk)
        if not tournament:
            return Response({'detail': 'Турнір не знайдено.'}, status=status.HTTP_404_NOT_FOUND)
        if role not in ('owner', 'admin'):
            return Response({'detail': 'Доступ заборонено.'}, status=status.HTTP_403_FORBIDDEN)

        minutes = request.data.get('minutes')
        try:
            minutes = int(minutes)
        except (TypeError, ValueError):
            return Response({'detail': 'minutes має бути цілим числом.'}, status=status.HTTP_400_BAD_REQUEST)

        if minutes == 0:
            tournament.registration_exception_until = None
            tournament.save(update_fields=['registration_exception_until'])
            return Response({'is_active': False, 'until': None})

        if minutes not in (15, 30, 60):
            return Response({'detail': 'Допустимі значення: 15, 30, 60.'}, status=status.HTTP_400_BAD_REQUEST)

        until = timezone.now() + timezone.timedelta(minutes=minutes)
        tournament.registration_exception_until = until
        tournament.save(update_fields=['registration_exception_until'])

        return Response({'is_active': True, 'until': until.isoformat()})


# ── Leaderboard view ──────────────────────────────────────────────────────────

class LeaderboardView(APIView):
    """
    GET   /tournaments/<tournament_pk>/leaderboard/
    PATCH /tournaments/<tournament_pk>/leaderboard/   Body: { "is_published": true|false }
    """
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


# ── Participant grades news view ──────────────────────────────────────────────

class ParticipantGradesNewsView(APIView):
    """
    GET /tournaments/my-grades/
    Повертає всі оцінені подання поточного учасника по всіх турнірах.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import TeamMember

        # 1. Оцінки за особисті здачі (одиночний формат)
        personal_grades = (
            Grade.objects
            .filter(submission__participant=request.user)
            .select_related(
                'juror',
                'submission__task',
                'submission__task__round',
                'submission__task__round__tournament',
                'submission__team',
            )
            .order_by('-updated_at')
        )

        # 2. Знаходимо всі команди де юзер є капітаном або прийнятим учасником
        captain_team_ids = list(
            Team.objects.filter(tournament__tournament_type='team', captain=request.user)
            .values_list('id', flat=True)
        )
        member_team_ids = list(
            TeamMember.objects.filter(
                user=request.user,
                status=TeamMember.STATUS_ACCEPTED,
                team__tournament__tournament_type='team',
            ).values_list('team_id', flat=True)
        )
        all_team_ids = list(set(captain_team_ids + member_team_ids))

        # 3. Оцінки за командні здачі (де юзер — будь-який учасник команди)
        team_grades = (
            Grade.objects
            .filter(submission__team_id__in=all_team_ids)
            .exclude(submission__participant=request.user)  # уникаємо дублів з personal
            .select_related(
                'juror',
                'submission__task',
                'submission__task__round',
                'submission__task__round__tournament',
                'submission__team',
            )
            .order_by('-updated_at')
        )

        # Об'єднуємо і сортуємо по даті
        all_grades = sorted(
            list(personal_grades) + list(team_grades),
            key=lambda g: g.updated_at,
            reverse=True,
        )

        result = []
        for grade in all_grades:
            sub        = grade.submission
            task       = sub.task
            round_     = task.round
            tournament = round_.tournament

            criteria_list = [
                {"key": c["key"], "label": c["label"], "max": c["max"]}
                for c in DEFAULT_CRITERIA
            ]

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
                "max_total":    MAX_TOTAL,
                "comment":      grade.comment or "",
                "graded_at":    grade.updated_at,
                "read":         False,
                "team_name":    sub.team.name if sub.team else None,
            })

        return Response(result, status=status.HTTP_200_OK)

# ── Leaderboard detail view ───────────────────────────────────────────────────

class LeaderboardDetailView(APIView):
    """
    GET /tournaments/<tournament_pk>/leaderboard/<participant_pk>/

    Деталізація учасника: бали по критеріях + середнє/сума по раундах.
    Якщо запитувач є owner/admin — додатково повертає jury_breakdown
    (оцінки кожного журі окремо).
    """
    permission_classes = [IsAuthenticated, IsTournamentParticipant]

    def get(self, request, tournament_pk, participant_pk):
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response(
                {'detail': 'Турнір не знайдено.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        membership = TournamentMember.objects.filter(
            tournament=tournament,
            user=request.user,
        ).first()

        if not membership:
            return Response(
                {'detail': 'Ви не є учасником цього турніру.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        role = membership.role
        is_privileged = role in ('owner', 'admin')

        if not is_privileged and not tournament.leaderboard_published:
            return Response(
                {'detail': 'Таблиця лідерів ще не опублікована.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        grades = (
            Grade.objects
            .filter(
                submission__task__round__tournament=tournament,
                submission__participant_id=participant_pk,
            )
            .select_related(
                'juror',
                'submission__task__round',
                'submission__participant',
            )
        )

        if not grades.exists():
            return Response(
                {'detail': 'Учасника не знайдено або він ще не має оцінок.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        first_grade = grades.first()
        participant = first_grade.submission.participant
        full_name = (
            f"{participant.first_name} {participant.last_name}".strip()
            or participant.username
            or f"Учасник #{participant_pk}"
        )

        round_data = {}

        for grade in grades:
            rid    = grade.submission.task.round_id
            rtitle = grade.submission.task.round.title

            if rid not in round_data:
                round_data[rid] = {'title': rtitle, 'grades': []}

            juror = grade.juror
            jname = (
                f"{juror.first_name} {juror.last_name}".strip()
                or juror.username
            )

            round_data[rid]['grades'].append({
                'juror_id':   juror.id,
                'juror_name': jname,
                'total':      grade.total,
                'scores':     grade.scores or {},
            })

        all_criteria_keys = [c['key'] for c in DEFAULT_CRITERIA]

        def _avg_criteria(grade_list):
            sums   = defaultdict(float)
            counts = defaultdict(int)
            for g in grade_list:
                for key, val in g['scores'].items():
                    try:
                        sums[key]   += float(val)
                        counts[key] += 1
                    except (TypeError, ValueError):
                        pass
            return {
                key: round(sums[key] / counts[key], 1)
                for key in all_criteria_keys
                if counts[key] > 0
            }

        rounds_out    = []
        grand_total   = 0.0
        global_sums   = defaultdict(float)
        global_counts = defaultdict(int)

        for rid, rinfo in sorted(round_data.items()):
            grade_list = rinfo['grades']
            totals     = [g['total'] for g in grade_list]
            avg_total  = round(sum(totals) / len(totals), 1) if totals else 0

            criteria_avg = _avg_criteria(grade_list)

            grand_total += avg_total
            for key, val in criteria_avg.items():
                global_sums[key]   += val
                global_counts[key] += 1

            round_obj = {
                'round_id':     rid,
                'round_title':  rinfo['title'],
                'avg_total':    avg_total,
                'criteria_avg': criteria_avg,
            }

            if is_privileged:
                round_obj['jury_breakdown'] = sorted(
                    grade_list, key=lambda g: g['total'], reverse=True
                )

            rounds_out.append(round_obj)

        grand_criteria_avg = {
            key: round(global_sums[key] / global_counts[key], 1)
            for key in all_criteria_keys
            if global_counts[key] > 0
        }

        return Response({
            'participant_id':   participant.id,
            'participant_name': full_name,
            'rounds':           rounds_out,
            'grand_total':      round(grand_total, 1),
            'criteria_avg':     grand_criteria_avg,
            'criteria_meta':    DEFAULT_CRITERIA,
        })


# ══════════════════════════════════════════════════════════════════════════════
# Announcements
# ══════════════════════════════════════════════════════════════════════════════

def _can_manage_ann(role):
    return role in ('owner', 'admin')


def _reaction_summary(reactions_qs, user_id):
    counts = {}
    my_reaction = None
    for r in reactions_qs:
        counts[r.emoji] = counts.get(r.emoji, 0) + 1
        if r.user_id == user_id:
            my_reaction = r.emoji
    return {'reactions': counts, 'my_reaction': my_reaction}


class AnnouncementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        role = _get_membership_role(request, tournament_pk)
        if role is None:
            return Response({'detail': 'Доступ заборонено.'}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            Announcement.objects
            .filter(tournament_id=tournament_pk)
            .select_related('author')
            .prefetch_related(
                'reactions',
                'comments__author',
                'comments__reactions',
                'comments__replies__author',
                'comments__replies__reactions',
            )
        )

        # Адмін/власник бачать усі; решта — тільки своє + "all"
        if not _can_manage_ann(role):
            qs = [a for a in qs if a.target_role in ('all', role)]

        serializer = AnnouncementSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, tournament_pk):
        role = _get_membership_role(request, tournament_pk)
        if not _can_manage_ann(role):
            return Response({'detail': 'Недостатньо прав.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AnnouncementSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            ann = serializer.save(tournament_id=tournament_pk, author=request.user)
            ann.refresh_from_db()
            return Response(
                AnnouncementSerializer(ann, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, tournament_pk, ann_pk):
        role = _get_membership_role(request, tournament_pk)
        if not _can_manage_ann(role):
            return Response({'detail': 'Недостатньо прав.'}, status=status.HTTP_403_FORBIDDEN)
        ann = generics.get_object_or_404(Announcement, pk=ann_pk, tournament_id=tournament_pk)
        ann.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AnnouncementReactView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, ann_pk):
        role = _get_membership_role(request, tournament_pk)
        if role is None:
            return Response({'detail': 'Доступ заборонено.'}, status=status.HTTP_403_FORBIDDEN)

        ann   = generics.get_object_or_404(Announcement, pk=ann_pk, tournament_id=tournament_pk)
        emoji = request.data.get('emoji', '')

        existing = AnnouncementReaction.objects.filter(
            user=request.user, announcement=ann
        ).first()

        if existing:
            if existing.emoji == emoji:
                existing.delete()
            else:
                existing.emoji = emoji
                existing.save(update_fields=['emoji'])
        else:
            AnnouncementReaction.objects.create(
                user=request.user, announcement=ann, emoji=emoji
            )

        return Response(_reaction_summary(ann.reactions.all(), request.user.id))


class AnnouncementCommentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, ann_pk):
        role = _get_membership_role(request, tournament_pk)
        if role is None:
            return Response({'detail': 'Доступ заборонено.'}, status=status.HTTP_403_FORBIDDEN)

        ann  = generics.get_object_or_404(Announcement, pk=ann_pk, tournament_id=tournament_pk)
        text = request.data.get('text', '').strip()

        if not text:
            return Response({'text': ["Це поле обов'язкове."]}, status=status.HTTP_400_BAD_REQUEST)

        parent = None
        parent_id = request.data.get('parent')
        if parent_id:
            parent = generics.get_object_or_404(
                AnnouncementComment, pk=parent_id, announcement=ann
            )

        comment = AnnouncementComment.objects.create(
            announcement=ann, author=request.user, text=text, parent=parent,
        )
        return Response(
            AnnouncementCommentSerializer(comment, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AnnouncementCommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, tournament_pk, ann_pk, comment_pk):
        role    = _get_membership_role(request, tournament_pk)
        comment = generics.get_object_or_404(
            AnnouncementComment,
            pk=comment_pk,
            announcement_id=ann_pk,
            announcement__tournament_id=tournament_pk,
        )
        if not (_can_manage_ann(role) or comment.author_id == request.user.id):
            return Response({'detail': 'Недостатньо прав.'}, status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AnnouncementCommentReactView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, ann_pk, comment_pk):
        role = _get_membership_role(request, tournament_pk)
        if role is None:
            return Response({'detail': 'Доступ заборонено.'}, status=status.HTTP_403_FORBIDDEN)

        comment = generics.get_object_or_404(
            AnnouncementComment,
            pk=comment_pk,
            announcement_id=ann_pk,
            announcement__tournament_id=tournament_pk,
        )
        emoji = request.data.get('emoji', '')

        existing = AnnouncementReaction.objects.filter(
            user=request.user, comment=comment
        ).first()

        if existing:
            if existing.emoji == emoji:
                existing.delete()
            else:
                existing.emoji = emoji
                existing.save(update_fields=['emoji'])
        else:
            AnnouncementReaction.objects.create(
                user=request.user, comment=comment, emoji=emoji
            )

        return Response(_reaction_summary(comment.reactions.all(), request.user.id))
