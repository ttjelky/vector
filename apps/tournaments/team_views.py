# tournaments/team_views.py
# ─────────────────────────────────────────────────────────────────────────────
# Нова логіка команд: чернетка → запрошення → реєстрація.
#
# Ендпоінти:
#   GET  /tournaments/<id>/teams/                            — список команд
#   POST /tournaments/<id>/teams/                            — створити чернетку
#   GET  /tournaments/<id>/teams/<team_pk>/                  — деталь команди
#   PATCH /tournaments/<id>/teams/<team_pk>/                 — редагувати метадані
#   DELETE /tournaments/<id>/teams/<team_pk>/                — видалити чернетку
#
#   POST /tournaments/<id>/teams/<team_pk>/invite/           — запросити учасника (капітан)
#   DELETE /tournaments/<id>/teams/<team_pk>/members/<mpk>/  — видалити учасника
#
#   POST /tournaments/<id>/teams/<team_pk>/register/         — зареєструвати команду (капітан)
#   POST /tournaments/<id>/teams/<team_pk>/lock/             — заблокувати склад (адмін)
#
#   GET  /tournaments/<id>/my-team/                          — моя команда
#
# Окремі ендпоінти без tournament_pk (для учасника, якого запросили):
#   GET  /team-invite/<token>/                               — інфо про запрошення
#   POST /team-invite/<token>/accept/                        — прийняти
#   POST /team-invite/<token>/decline/                       — відхилити
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Tournament, TournamentMember, Team, TeamMember
from .team_serializers import (
    TeamSerializer, TeamCreateSerializer, TeamUpdateSerializer,
    TeamInviteMemberSerializer, TeamMemberSerializer,
    TeamAdminSerializer,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_tournament_or_404(pk):
    try:
        return Tournament.objects.get(pk=pk)
    except Tournament.DoesNotExist:
        return None


def _get_team_or_404(tournament_pk, team_pk):
    try:
        return Team.objects.prefetch_related('members__user').select_related('captain').get(
            pk=team_pk, tournament_id=tournament_pk
        )
    except Team.DoesNotExist:
        return None


def _is_privileged(user, tournament_pk):
    m = TournamentMember.objects.filter(
        tournament_id=tournament_pk, user=user
    ).first()
    return m and m.role in ('owner', 'admin')


def _is_captain(user, team: Team):
    return team.captain_id == user.pk


# ── TeamListCreateView ────────────────────────────────────────────────────────

class TeamListCreateView(APIView):
    """
    GET  → список команд турніру
    POST → створити команду-чернетку (капітан)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        tournament = _get_tournament_or_404(tournament_pk)
        if not tournament:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        privileged = _is_privileged(request.user, tournament_pk)

        qs = Team.objects.filter(
            tournament_id=tournament_pk
        ).prefetch_related('members__user').select_related('captain')

        if privileged:
            # Адмін/власник бачить всі команди (і чернетки і зареєстровані)
            return Response(TeamAdminSerializer(qs, many=True).data)
        else:
            # Учасники бачать тільки зареєстровані команди
            return Response(TeamSerializer(
                qs.filter(status=Team.STATUS_REGISTERED), many=True
            ).data)

    def post(self, request, tournament_pk):
        tournament = _get_tournament_or_404(tournament_pk)
        if not tournament:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        serializer = TeamCreateSerializer(
            data=request.data,
            context={'tournament': tournament, 'captain': request.user},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        team = serializer.save()
        return Response(TeamSerializer(team).data, status=201)


# ── TeamDetailView ────────────────────────────────────────────────────────────

class TeamDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk, team_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)
        return Response(TeamSerializer(team).data)

    def patch(self, request, tournament_pk, team_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        privileged = _is_privileged(request.user, tournament_pk)
        captain    = _is_captain(request.user, team)

        if not privileged and not captain:
            return Response({'detail': 'Недостатньо прав.'}, status=403)

        if privileged and not captain:
            # Адмін: пряме оновлення без перевірки is_roster_editable
            for attr in ('name', 'city', 'contact'):
                if attr in request.data:
                    setattr(team, attr, request.data[attr])
            team.save()
            return Response(TeamSerializer(team).data)

        # Капітан: через серіалізатор з валідацією статусу
        serializer = TeamUpdateSerializer(
            team, data=request.data, partial=True,
            context={'team': team},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response(TeamSerializer(team).data)

    def delete(self, request, tournament_pk, team_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        privileged = _is_privileged(request.user, tournament_pk)
        captain    = _is_captain(request.user, team)

        if not privileged and not captain:
            return Response({'detail': 'Недостатньо прав.'}, status=403)

        # Капітан може видалити тільки чернетку
        if captain and not privileged and team.status != Team.STATUS_DRAFT:
            return Response(
                {'detail': 'Зареєстровану команду видалити не можна. Зверніться до адміністратора.'},
                status=400,
            )

        team.delete()
        return Response(status=204)


# ── TeamInviteView ────────────────────────────────────────────────────────────

class TeamInviteView(APIView):
    """
    POST /tournaments/<id>/teams/<team_pk>/invite/
    Капітан запрошує учасника за email.
    """
    permission_classes = [AllowAny]

    def post(self, request, tournament_pk, team_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        privileged = _is_privileged(request.user, tournament_pk)
        captain    = _is_captain(request.user, team)

        if not privileged and not captain:
            return Response({'detail': 'Тільки капітан може запрошувати учасників.'}, status=403)

        serializer = TeamInviteMemberSerializer(
            data=request.data,
            context={'team': team, 'captain': request.user},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        member = serializer.save()
        # TODO: надіслати email-сповіщення учаснику з посиланням на прийняття
        return Response(TeamMemberSerializer(member).data, status=201)


# ── TeamMemberRemoveView ──────────────────────────────────────────────────────

class TeamMemberRemoveView(APIView):
    """
    DELETE /tournaments/<id>/teams/<team_pk>/members/<member_pk>/
    Капітан видаляє учасника (pending або accepted).
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, tournament_pk, team_pk, member_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        privileged = _is_privileged(request.user, tournament_pk)
        captain    = _is_captain(request.user, team)

        if not privileged and not captain:
            return Response({'detail': 'Тільки капітан може видаляти учасників.'}, status=403)

        if not privileged and not team.is_roster_editable():
            return Response({'detail': 'Склад зафіксований.'}, status=400)

        try:
            member = TeamMember.objects.get(pk=member_pk, team=team)
        except TeamMember.DoesNotExist:
            return Response({'detail': 'Учасника не знайдено.'}, status=404)

        member.delete()
        return Response(status=204)


# ── TeamRegisterView ──────────────────────────────────────────────────────────

class TeamRegisterView(APIView):
    """
    POST /tournaments/<id>/teams/<team_pk>/register/
    Капітан офіційно реєструє команду (draft → registered).
    Умова: total_participant_count() >= min_team_size.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, team_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        if not _is_captain(request.user, team) and not _is_privileged(request.user, tournament_pk):
            return Response({'detail': 'Тільки капітан може зареєструвати команду.'}, status=403)

        if team.status == Team.STATUS_REGISTERED:
            return Response({'detail': 'Команда вже зареєстрована.'}, status=400)

        if not team.can_register():
            t = team.tournament
            min_size = t.min_team_size or 2
            current  = team.total_participant_count()
            if current < min_size:
                return Response(
                    {
                        'detail': (
                            f"Недостатньо учасників. "
                            f"Мінімум: {min_size}, зараз: {current} "
                            f"(капітан + {current - 1} прийнятих)."
                        )
                    },
                    status=400,
                )
            return Response({'detail': 'Реєстрація у турнірі закрита.'}, status=400)

        # Ліміт зареєстрованих команд
        t = team.tournament
        if t.max_teams:
            registered_count = Team.objects.filter(
                tournament=t, status=Team.STATUS_REGISTERED
            ).count()
            if registered_count >= t.max_teams:
                return Response(
                    {'detail': 'Досягнуто максимальну кількість команд у турнірі.'},
                    status=400,
                )

        team.status = Team.STATUS_REGISTERED
        team.save(update_fields=['status'])
        return Response(TeamSerializer(team).data)


# ── TeamRosterLockView ────────────────────────────────────────────────────────

class TeamRosterLockView(APIView):
    """
    POST /tournaments/<id>/teams/<team_pk>/lock/
    Body: { "locked": true | false }
    Тільки адмін / власник.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, team_pk):
        if not _is_privileged(request.user, tournament_pk):
            return Response({'detail': 'Тільки адмін або власник може змінювати статус блокування.'}, status=403)

        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        locked = request.data.get('locked')
        if locked is None:
            return Response({'detail': 'Поле "locked" обов\'язкове.'}, status=400)

        team.roster_locked = bool(locked)
        team.save(update_fields=['roster_locked'])
        return Response({'id': team.id, 'roster_locked': team.roster_locked})


# ── MyTeamView ────────────────────────────────────────────────────────────────

class MyTeamView(APIView):
    """
    GET /tournaments/<id>/my-team/
    Повертає команду де поточний юзер є капітаном або прийнятим учасником.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        user = request.user

        # Капітан
        team = Team.objects.filter(
            tournament_id=tournament_pk,
            captain=user,
        ).prefetch_related('members__user').select_related('captain').first()

        # Учасник (accepted)
        if not team:
            membership = TeamMember.objects.filter(
                team__tournament_id=tournament_pk,
                user=user,
                status=TeamMember.STATUS_ACCEPTED,
            ).select_related('team').first()
            if membership:
                team = Team.objects.prefetch_related('members__user').select_related('captain').get(
                    pk=membership.team_id
                )

        if not team:
            return Response({'detail': 'Ви не перебуваєте в жодній команді.'}, status=404)

        data = TeamSerializer(team).data
        data['is_captain'] = (team.captain_id == user.pk)
        return Response(data)


# ── TeamInviteAcceptView / TeamInviteDeclineView ───────────────────────────────
# Ці view працюють через team_invite_token (UUID самої команди).
# URL: /team-invite/<token>/accept/  і  /team-invite/<token>/decline/

class TeamInviteAcceptView(APIView):
    """
    POST /team-invite/<token>/accept/
    Автентифікований юзер приймає запрошення у команду.
    Працює і для запрошення за email (PENDING), і для посилання (без запису).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        try:
            team = Team.objects.select_related('tournament', 'captain').get(
                team_invite_token=token
            )
        except Team.DoesNotExist:
            return Response({'detail': 'Неправильне посилання запрошення.'}, status=404)

        if team.captain == request.user:
            return Response({'detail': 'Ви є капітаном цієї команди.'}, status=400)

        if not team.is_roster_editable():
            return Response(
                {'detail': 'Команда вже зареєстрована або склад зафіксований.'},
                status=400,
            )

        # Юзер не повинен бути прийнятим в іншій команді цього турніру
        conflict = TeamMember.objects.filter(
            team__tournament=team.tournament,
            user=request.user,
            status=TeamMember.STATUS_ACCEPTED,
        ).exclude(team=team).exists()
        if conflict:
            return Response(
                {'detail': 'Ви вже є учасником іншої команди у цьому турнірі.'},
                status=400,
            )

        # Ліміт учасників
        t = team.tournament
        if t.max_team_size:
            current = team.members.count() + 1  # +1 captain
            if current >= t.max_team_size:
                return Response(
                    {'detail': f'Команда вже заповнена (макс. {t.max_team_size} учасників).'},
                    status=400,
                )

        # Отримуємо або створюємо membership
        membership, created = TeamMember.objects.get_or_create(
            team=team,
            user=request.user,
            defaults={'status': TeamMember.STATUS_ACCEPTED},
        )

        if not created:
            if membership.status == TeamMember.STATUS_ACCEPTED:
                return Response({'detail': 'Ви вже є учасником цієї команди.'}, status=400)
            membership.status = TeamMember.STATUS_ACCEPTED
            membership.save(update_fields=['status'])

        # Додаємо юзера як учасника турніру якщо ще не доданий
        from .models import TournamentMember
        TournamentMember.objects.get_or_create(
            tournament=team.tournament,
            user=request.user,
            defaults={'role': 'participant'},
        )

        return Response(TeamMemberSerializer(membership).data)


class TeamInviteDeclineView(APIView):
    """
    POST /team-invite/<token>/decline/
    Автентифікований юзер відхиляє запрошення — запис видаляється.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        try:
            team = Team.objects.get(team_invite_token=token)
        except Team.DoesNotExist:
            return Response({'detail': 'Неправильне посилання запрошення.'}, status=404)

        try:
            membership = TeamMember.objects.get(
                team=team,
                user=request.user,
                status=TeamMember.STATUS_PENDING,
            )
        except TeamMember.DoesNotExist:
            return Response(
                {'detail': 'Активного запрошення не знайдено.'},
                status=404,
            )

        membership.delete()
        return Response({'detail': 'Запрошення відхилено.'})


class TeamInviteInfoView(APIView):
    """
    GET /team-invite/<token>/
    Повертає інфо про команду. Будь-який залогінений юзер з посиланням може переглянути.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        try:
            team = Team.objects.select_related('tournament', 'captain').get(
                team_invite_token=token
            )
        except Team.DoesNotExist:
            return Response({'detail': 'Неправильне посилання запрошення.'}, status=404)

        if team.captain == request.user:
            return Response({'detail': 'Ви є капітаном цієї команди.'}, status=400)

        existing = TeamMember.objects.filter(team=team, user=request.user).first()
        if existing and existing.status == TeamMember.STATUS_ACCEPTED:
            return Response({'detail': 'Ви вже є учасником цієї команди.'}, status=400)

        conflict = TeamMember.objects.filter(
            team__tournament=team.tournament,
            user=request.user,
            status=TeamMember.STATUS_ACCEPTED,
        ).exclude(team=team).exists()
        if conflict:
            return Response({'detail': 'Ви вже є учасником іншої команди у цьому турнірі.'}, status=400)

        return Response({
            'team_id':         team.id,
            'team_name':       team.name,
            'tournament_id':   team.tournament.id,
            'tournament_name': team.tournament.name,
            'captain_name':    f"{team.captain.first_name} {team.captain.last_name}".strip() or team.captain.username,
        })
