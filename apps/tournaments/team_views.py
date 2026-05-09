from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from .models import Tournament, TournamentMember, Team, TeamUploadPermission


def _get_membership(user, tournament_pk):
    return TournamentMember.objects.filter(
        tournament_id=tournament_pk, user=user
    ).first()


class TeamListCreateView(APIView):
    """
    GET  /tournaments/<id>/teams/         — список команд турніру
    POST /tournaments/<id>/teams/         — створити команду (капітан)

    Реєстрація команди доступна тільки у вікні registration_start..registration_end.
    Капітан — учасник турніру який реєструє команду.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        membership = _get_membership(request.user, tournament_pk)
        if not membership:
            return Response({'detail': 'Ви не є учасником цього турніру.'}, status=403)

        teams = Team.objects.filter(tournament_id=tournament_pk).prefetch_related('members')
        data = []
        for team in teams:
            members = team.members.all()
            upload_perm_ids = set(
                TeamUploadPermission.objects.filter(team=team).values_list('user_id', flat=True)
            )
            data.append({
                'id':         team.id,
                'name':       team.name,
                'captain_id': team.captain_id,
                'captain':    _user_repr(team.captain),
                'members':    [_user_repr(m, upload_perm_ids) for m in members],
                'created_at': team.created_at,
            })
        return Response(data)

    def post(self, request, tournament_pk):
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        if tournament.tournament_type != 'team':
            return Response({'detail': 'Це не командний турнір.'}, status=400)

        membership = _get_membership(request.user, tournament_pk)
        if not membership or membership.role not in ('participant', 'owner', 'admin'):
            return Response({'detail': 'Ви не є учасником цього турніру.'}, status=403)

        # Перевірка вікна реєстрації
        if not tournament.is_registration_open():
            return Response(
                {'detail': 'Реєстрація команд зараз закрита. Перевірте дати реєстрації.'},
                status=400,
            )

        # Ліміт команд
        if tournament.max_teams and Team.objects.filter(tournament=tournament).count() >= tournament.max_teams:
            return Response({'detail': 'Досягнуто максимальну кількість команд.'}, status=400)

        # Капітан може мати тільки одну команду в турнірі
        if Team.objects.filter(tournament=tournament, captain=request.user).exists():
            return Response({'detail': 'Ви вже є капітаном команди в цьому турнірі.'}, status=400)

        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'Назва команди обов\'язкова.'}, status=400)

        team = Team.objects.create(
            tournament=tournament,
            name=name,
            captain=request.user,
        )
        team.members.add(request.user)

        return Response({
            'id':         team.id,
            'name':       team.name,
            'captain_id': team.captain_id,
            'captain':    _user_repr(team.captain),
            'members':    [_user_repr(request.user)],
        }, status=201)


class TeamDetailView(APIView):
    """
    GET    /tournaments/<id>/teams/<team_id>/  — деталі команди
    PATCH  /tournaments/<id>/teams/<team_id>/  — перейменувати (тільки капітан)
    DELETE /tournaments/<id>/teams/<team_id>/  — видалити (тільки капітан або owner/admin)
    """
    permission_classes = [IsAuthenticated]

    def _get_team(self, tournament_pk, team_pk):
        try:
            return Team.objects.prefetch_related('members').get(
                pk=team_pk, tournament_id=tournament_pk
            )
        except Team.DoesNotExist:
            return None

    def get(self, request, tournament_pk, team_pk):
        team = self._get_team(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)
        upload_perm_ids = set(
            TeamUploadPermission.objects.filter(team=team).values_list('user_id', flat=True)
        )
        return Response({
            'id':         team.id,
            'name':       team.name,
            'captain_id': team.captain_id,
            'captain':    _user_repr(team.captain),
            'members':    [_user_repr(m, upload_perm_ids) for m in team.members.all()],
        })

    def patch(self, request, tournament_pk, team_pk):
        team = self._get_team(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)
        if team.captain != request.user:
            return Response({'detail': 'Тільки капітан може редагувати команду.'}, status=403)
        name = request.data.get('name', '').strip()
        if name:
            team.name = name
            team.save(update_fields=['name'])
        return Response({'id': team.id, 'name': team.name})

    def delete(self, request, tournament_pk, team_pk):
        team = self._get_team(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)
        membership = _get_membership(request.user, tournament_pk)
        is_privileged = membership and membership.role in ('owner', 'admin')
        if team.captain != request.user and not is_privileged:
            return Response({'detail': 'Недостатньо прав.'}, status=403)
        team.delete()
        return Response(status=204)


class TeamMemberView(APIView):
    """
    POST   /tournaments/<id>/teams/<team_id>/members/          — додати учасника до команди
    DELETE /tournaments/<id>/teams/<team_id>/members/<user_id>/ — видалити учасника
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, team_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        # Тільки капітан або адмін/власник можуть додавати
        membership = _get_membership(request.user, tournament_pk)
        is_privileged = membership and membership.role in ('owner', 'admin')
        if team.captain != request.user and not is_privileged:
            return Response({'detail': 'Тільки капітан може додавати учасників.'}, status=403)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id обов\'язковий.'}, status=400)

        # Перевірка що user є учасником турніру
        target_membership = TournamentMember.objects.filter(
            tournament_id=tournament_pk, user_id=user_id, role='participant'
        ).first()
        if not target_membership:
            return Response({'detail': 'Користувач не є учасником цього турніру.'}, status=400)

        # Перевірка ліміту
        tournament = Tournament.objects.get(pk=tournament_pk)
        if tournament.max_team_size and team.members.count() >= tournament.max_team_size:
            return Response({'detail': 'Команда вже заповнена.'}, status=400)

        # Перевірка що user не в іншій команді цього турніру
        if Team.objects.filter(tournament_id=tournament_pk, members=user_id).exists():
            return Response({'detail': 'Цей учасник вже є в іншій команді.'}, status=400)

        team.members.add(user_id)
        return Response({'detail': 'Учасника додано.'}, status=200)

    def delete(self, request, tournament_pk, team_pk, user_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        membership = _get_membership(request.user, tournament_pk)
        is_privileged = membership and membership.role in ('owner', 'admin')
        if team.captain != request.user and not is_privileged:
            return Response({'detail': 'Тільки капітан може видаляти учасників.'}, status=403)

        if team.captain_id == int(user_pk):
            return Response({'detail': 'Не можна видалити капітана з команди.'}, status=400)

        team.members.remove(user_pk)
        TeamUploadPermission.objects.filter(team=team, user_id=user_pk).delete()
        return Response(status=204)


class TeamUploadPermissionView(APIView):
    """
    POST   /tournaments/<id>/teams/<team_id>/upload-permission/          — видати дозвіл
    DELETE /tournaments/<id>/teams/<team_id>/upload-permission/<user_id>/ — забрати дозвіл

    Тільки капітан може керувати дозволами.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, team_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)
        if team.captain != request.user:
            return Response({'detail': 'Тільки капітан може видавати дозволи.'}, status=403)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id обов\'язковий.'}, status=400)

        # Перевірка що user є членом команди
        if not team.members.filter(id=user_id).exists():
            return Response({'detail': 'Користувач не є членом команди.'}, status=400)

        if int(user_id) == team.captain_id:
            return Response({'detail': 'Капітан завжди має право завантажувати.'}, status=400)

        perm, created = TeamUploadPermission.objects.get_or_create(team=team, user_id=user_id)
        return Response({'detail': 'Дозвіл видано.', 'created': created})

    def delete(self, request, tournament_pk, team_pk, user_pk):
        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)
        if team.captain != request.user:
            return Response({'detail': 'Тільки капітан може забирати дозволи.'}, status=403)

        TeamUploadPermission.objects.filter(team=team, user_id=user_pk).delete()
        return Response(status=204)


class AdminAssignTeamView(APIView):
    """
    POST /tournaments/<id>/teams/<team_id>/assign-member/
    Адмін/власник може вручну розподілити учасника в команду.
    Body: { "user_id": 5 }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, team_pk):
        membership = _get_membership(request.user, tournament_pk)
        if not membership or membership.role not in ('owner', 'admin'):
            return Response({'detail': 'Тільки власник або адмін може розподіляти учасників.'}, status=403)

        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        user_id = request.data.get('user_id')
        target = TournamentMember.objects.filter(
            tournament_id=tournament_pk, user_id=user_id
        ).first()
        if not target:
            return Response({'detail': 'Користувач не є учасником турніру.'}, status=400)

        # Видалити з попередньої команди якщо є
        Team.objects.filter(tournament_id=tournament_pk, members=user_id).exclude(pk=team_pk).first()
        for old_team in Team.objects.filter(tournament_id=tournament_pk, members=user_id):
            if old_team.pk != team.pk:
                old_team.members.remove(user_id)
                TeamUploadPermission.objects.filter(team=old_team, user_id=user_id).delete()

        team.members.add(user_id)
        return Response({'detail': 'Учасника розподілено в команду.'})


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_team_or_404(tournament_pk, team_pk):
    try:
        return Team.objects.prefetch_related('members').get(
            pk=team_pk, tournament_id=tournament_pk
        )
    except Team.DoesNotExist:
        return None


def _user_repr(user, upload_perm_ids=None):
    return {
        'id':         user.id,
        'username':   user.username,
        'first_name': user.first_name,
        'last_name':  user.last_name,
        'can_upload': True if upload_perm_ids is None else (user.id in upload_perm_ids),
    }
