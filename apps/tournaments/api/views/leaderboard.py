# tournaments/team_leaderboard_view.py
# ─────────────────────────────────────────────────────────────────────────────
# GET /tournaments/<tournament_pk>/leaderboard/team/<team_pk>/
#
# Повертає деталізацію результатів команди для таблиці лідерів:
#   {
#     team_name, grand_total, members_count,
#     members: [{ participant_id, name, is_captain, total }],
#     criteria_meta: [{ key, label, max }],
#     criteria_avg: { <key>: avg_value },
#     rounds: [
#       {
#         round_id, round_title, avg_total,
#         criteria_avg: { <key>: avg },
#         submissions: [
#           {
#             submission_id, participant_id, participant_name,
#             task_id, task_title,
#             scores: { <key>: value },
#             total
#           }
#         ],
#         jury_breakdown: [                   # тільки для owner/admin
#           { juror_id, juror_name, scores: {...}, total }
#         ]
#       }
#     ]
#   }
#
# Доступ:
#   - owner / admin  → завжди (навіть якщо leaderboard не опублікований)
#   - jury           → тільки якщо leaderboard опублікований
#   - учасник/капітан → тільки якщо leaderboard опублікований
# ─────────────────────────────────────────────────────────────────────────────

from collections import defaultdict
from django.db.models import Avg

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ...models import (
    Tournament, TournamentMember,
    Team, TeamMember,
    Round, Task, Submission, Grade,
)
from .team import _get_tournament_or_404, _is_privileged


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_team_or_404(tournament_pk, team_pk):
    try:
        return (
            Team.objects
            .prefetch_related('members__user')
            .select_related('captain', 'tournament')
            .get(pk=team_pk, tournament_id=tournament_pk)
        )
    except Team.DoesNotExist:
        return None


def _leaderboard_published(tournament):
    """Повертає True якщо таблиця лідерів опублікована."""
    # Підтримуємо обидва варіанти: поле на моделі або окремий об'єкт налаштувань
    if hasattr(tournament, 'leaderboard_published'):
        return bool(tournament.leaderboard_published)
    try:
        from ...models import LeaderboardSettings
        settings = LeaderboardSettings.objects.get(tournament=tournament)
        return settings.is_published
    except Exception:
        return True  # якщо модель не знайдена — вважаємо опублікованою


def _member_display_name(user):
    full = f"{user.first_name} {user.last_name}".strip()
    return full or user.username


def _build_criteria_meta(tasks_qs):
    """
    Збирає унікальні критерії оцінювання з усіх завдань раунду.
    Підтримує як JSONField criteria_config, так і окрему модель Criterion.
    Повертає list[{ key, label, max }].
    """
    meta = {}

    for task in tasks_qs:
        # Варіант 1: criteria_config — JSONField вигляду
        #   [{"key": "creativity", "label": "Креативність", "max": 10}, ...]
        criteria_config = getattr(task, 'criteria_config', None)
        if criteria_config and isinstance(criteria_config, list):
            for c in criteria_config:
                key = c.get('key') or c.get('id')
                if key and key not in meta:
                    meta[key] = {
                        'key':   key,
                        'label': c.get('label', key),
                        'max':   c.get('max', 10),
                    }
            continue

        # Варіант 2: пов'язана модель Criterion (через task.criteria.all())
        task_criteria = getattr(task, 'criteria', None)
        if task_criteria is not None:
            for c in task_criteria.all():
                key = str(c.pk)
                if key not in meta:
                    meta[key] = {
                        'key':   key,
                        'label': getattr(c, 'name', key),
                        'max':   getattr(c, 'max_score', 10),
                    }

    return list(meta.values())


def _extract_scores(grade, criteria_meta):
    """
    Витягує словник { key: value } з об'єкта Grade.
    Підтримує JSONField `scores` і окремі поля.
    """
    raw = getattr(grade, 'scores', None)
    if isinstance(raw, dict):
        return {c['key']: raw.get(c['key'], raw.get(str(c['key']))) for c in criteria_meta}

    # Якщо scores — плоскі поля на моделі
    return {c['key']: getattr(grade, c['key'], None) for c in criteria_meta}


def _avg_scores(scores_list, criteria_meta):
    """Середнє по кожному критерію зі списку словників scores."""
    if not scores_list:
        return {}
    result = {}
    for c in criteria_meta:
        vals = [s[c['key']] for s in scores_list if s.get(c['key']) is not None]
        result[c['key']] = round(sum(vals) / len(vals), 2) if vals else None
    return result


# ── View ──────────────────────────────────────────────────────────────────────

class TeamLeaderboardDetailView(APIView):
    """
    GET /tournaments/<tournament_pk>/leaderboard/team/<team_pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk, team_pk):
        tournament = _get_tournament_or_404(tournament_pk)
        if not tournament:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        team = _get_team_or_404(tournament_pk, team_pk)
        if not team:
            return Response({'detail': 'Команду не знайдено.'}, status=404)

        privileged  = _is_privileged(request.user, tournament_pk)
        published   = _leaderboard_published(tournament)

        if not privileged and not published:
            return Response({'detail': 'Таблиця лідерів ще не опублікована.'}, status=403)

        # ── Учасники команди ──────────────────────────────────────────────────
        captain = team.captain
        members_qs = team.members.filter(
            status=TeamMember.STATUS_ACCEPTED
        ).select_related('user')

        # participant_id = TournamentMember.id (або user.id як fallback)
        def get_tm_id(user):
            tm = TournamentMember.objects.filter(
                tournament_id=tournament_pk, user=user
            ).first()
            return tm.id if tm else user.id

        captain_tm_id = get_tm_id(captain)

        members_info = [{
            'participant_id': captain_tm_id,
            'user_id':        captain.id,
            'name':           _member_display_name(captain),
            'is_captain':     True,
        }]
        for m in members_qs:
            if m.user_id == captain.id:
                continue
            members_info.append({
                'participant_id': get_tm_id(m.user),
                'user_id':        m.user_id,
                'name':           _member_display_name(m.user),
                'is_captain':     False,
            })

        member_user_ids  = {mi['user_id'] for mi in members_info}
        member_by_uid    = {mi['user_id']: mi for mi in members_info}

        # ── Раунди ────────────────────────────────────────────────────────────
        rounds_qs = (
            Round.objects
            .filter(tournament_id=tournament_pk)
            .prefetch_related('tasks')
            .order_by('start_date', 'id')
        )

        rounds_data     = []
        all_criteria_meta = {}
        grand_total_sum  = 0
        grand_total_cnt  = 0

        # Для підрахунку особистих балів учасників
        member_totals = defaultdict(float)

        for rnd in rounds_qs:
            tasks = list(rnd.tasks.all())
            if not tasks:
                continue

            # Критерії цього раунду
            criteria_meta = _build_criteria_meta(tasks)
            for c in criteria_meta:
                all_criteria_meta[c['key']] = c

            task_ids = [t.id for t in tasks]

            # Submissions членів команди у цьому раунді
            subs_qs = (
                Submission.objects
                .filter(
                    task_id__in=task_ids,
                    participant_id__in=member_user_ids,
                )
                .select_related('participant', 'task')
                .order_by('id')
            )

            submissions_data = []
            round_totals     = []
            round_scores_all = []

            # Grades: { submission_id: [Grade, ...] }
            sub_ids   = [s.id for s in subs_qs]
            grades_qs = (
                Grade.objects
                .filter(submission_id__in=sub_ids)
                .select_related('juror')
            )
            grades_by_sub = defaultdict(list)
            for g in grades_qs:
                grades_by_sub[g.submission_id].append(g)

            for sub in subs_qs:
                sub_grades = grades_by_sub.get(sub.id, [])
                if not sub_grades:
                    continue

                # Середнє по всіх журі для цього submission
                scores_per_grade = [_extract_scores(g, criteria_meta) for g in sub_grades]
                avg_scores       = _avg_scores(scores_per_grade, criteria_meta)

                total_val = getattr(sub_grades[0], 'total', None)
                if total_val is None:
                    vals = [v for v in avg_scores.values() if v is not None]
                    total_val = round(sum(vals), 2) if vals else 0

                uid = sub.participant_id
                mi  = member_by_uid.get(uid, {})

                submissions_data.append({
                    'submission_id':    sub.id,
                    'participant_id':   mi.get('participant_id'),
                    'participant_name': mi.get('name', ''),
                    'task_id':          sub.task_id,
                    'task_title':       getattr(sub.task, 'title', f'Завдання {sub.task_id}'),
                    'scores':           avg_scores,
                    'total':            total_val,
                })

                round_totals.append(total_val)
                round_scores_all.append(avg_scores)
                member_totals[uid] += total_val

            if not submissions_data:
                continue

            avg_total = round(sum(round_totals) / len(round_totals), 2) if round_totals else 0
            grand_total_sum += sum(round_totals)
            grand_total_cnt += len(round_totals)

            round_payload = {
                'round_id':    rnd.id,
                'round_title': rnd.title,
                'avg_total':   avg_total,
                'criteria_avg': _avg_scores(round_scores_all, criteria_meta),
                'submissions': submissions_data,
            }

            # Jury breakdown (тільки для owner/admin)
            if privileged:
                jury_rows = defaultdict(lambda: {'scores': {}, 'total': 0, '_vals': []})
                for sub in subs_qs:
                    for g in grades_by_sub.get(sub.id, []):
                        juror    = g.juror
                        jid      = juror.id
                        jname    = _member_display_name(juror)
                        row      = jury_rows[jid]
                        row['juror_id']   = jid
                        row['juror_name'] = jname
                        g_scores = _extract_scores(g, criteria_meta)
                        for k, v in g_scores.items():
                            if v is not None:
                                row['scores'][k] = row['scores'].get(k, 0) + v
                        g_total = getattr(g, 'total', None)
                        if g_total is None:
                            g_total = sum(v for v in g_scores.values() if v is not None)
                        row['_vals'].append(g_total)

                jury_breakdown = []
                for row in jury_rows.values():
                    jury_breakdown.append({
                        'juror_id':   row['juror_id'],
                        'juror_name': row['juror_name'],
                        'scores':     row['scores'],
                        'total':      round(sum(row['_vals']), 2),
                    })
                round_payload['jury_breakdown'] = jury_breakdown

            rounds_data.append(round_payload)

        # ── Підсумкові бали учасників ─────────────────────────────────────────
        for mi in members_info:
            mi['total'] = round(member_totals.get(mi['user_id'], 0), 2)

        grand_total = round(grand_total_sum, 2)

        # criteria_avg по всіх раундах
        all_round_scores = []
        for rnd in rounds_data:
            all_round_scores.extend(
                [s['scores'] for s in rnd.get('submissions', [])]
            )
        final_criteria_meta = list(all_criteria_meta.values())
        overall_criteria_avg = _avg_scores(all_round_scores, final_criteria_meta)

        return Response({
            'team_id':       team.id,
            'team_name':     team.name,
            'grand_total':   grand_total,
            'members_count': len(members_info),
            'members':       members_info,
            'criteria_meta': final_criteria_meta,
            'criteria_avg':  overall_criteria_avg,
            'rounds':        rounds_data,
        })
