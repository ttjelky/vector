from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import (
    Tournament, TournamentMember,
    Submission, Grade, JuryAssignment,
    JuryGradingCriterion,
)


# ── helpers ───────────────────────────────────────────────────────────────────

DEFAULT_CRITERION = {
    "key":   "score",
    "label": "Загальна оцінка",
    "max":   10,
    "group": "",
    "hint":  "",
    "order": 0,
}


def _criteria_for_tournament(tournament):
    """
    Повертає список dict для фронтенду.
    Якщо адмін ще не налаштував критерії — повертаємо один дефолтний.
    """
    qs = JuryGradingCriterion.objects.filter(tournament=tournament)
    if not qs.exists():
        return [DEFAULT_CRITERION]
    return [
        {
            "key":   c.key,
            "label": c.label,
            "max":   c.max_score,
            "group": c.group,
            "hint":  c.hint,
            "order": c.order,
        }
        for c in qs
    ]


def _serialize_submission(sub, user_grades_map, is_team):
    """Серіалізує Submission у dict для JuryTab."""
    my_grade = user_grades_map.get(sub.id)
    return {
        "id":           sub.id,
        "task_title":   sub.task.title,
        "round_id":     sub.task.round_id,
        "round_title":  sub.task.round.title,
        "author_name":  sub.participant.username,
        "team_name":    sub.team.name if (is_team and sub.team) else None,
        "submitted_at": sub.submitted_at.isoformat(),
        "content_text": sub.text,
        "content_links": [
            {"id": lnk.id, "label": lnk.label, "url": lnk.url}
            for lnk in sub.links.all()
        ],
        "content_files": [
            {"id": att.id, "name": att.name, "file": att.file.url if att.file else None}
            for att in sub.attachments.all()
        ],
        "my_grade": {
            "id":         my_grade.id,
            "scores":     my_grade.scores,
            "comment":    my_grade.comment,
            "total":      my_grade.total,
            "updated_at": my_grade.updated_at.isoformat(),
        } if my_grade else None,
    }


# ── Views ─────────────────────────────────────────────────────────────────────

class JuryPendingSubmissionsView(APIView):
    """
    GET /api/tournaments/jury/pending-submissions/

    Повертає для поточного журі список турнірів з кількістю
    здач що ще не мають його оцінки.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        jury_memberships = TournamentMember.objects.filter(
            user=user,
            role__in=("jury", "admin", "owner"),
        ).select_related("tournament")

        result = []
        for membership in jury_memberships:
            tournament = membership.tournament
            all_submissions = Submission.objects.filter(
                task__round__tournament=tournament,
            )
            graded_ids = Grade.objects.filter(
                juror=user,
                submission__task__round__tournament=tournament,
            ).values_list("submission_id", flat=True)

            pending_count = all_submissions.exclude(id__in=graded_ids).count()
            if pending_count > 0:
                result.append({
                    "tournament_id":   tournament.id,
                    "tournament_name": tournament.name,
                    "pending_count":   pending_count,
                })

        result.sort(key=lambda x: x["pending_count"], reverse=True)
        return Response(result)


class JurySubmissionsView(APIView):
    """
    GET /api/tournaments/<pk>/jury/submissions/

    Повертає submissions + criteria для поточного журі.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        tournament = get_object_or_404(Tournament, pk=tournament_pk)
        user = request.user

        # Перевірка ролі
        membership = TournamentMember.objects.filter(
            tournament=tournament,
            user=user,
            role__in=("jury", "admin", "owner"),
        ).first()
        if not membership:
            return Response({"detail": "Немає доступу."}, status=status.HTTP_403_FORBIDDEN)

        is_team = tournament.tournament_type == "team"
        is_distributed = JuryAssignment.objects.filter(tournament=tournament).exists()

        # Які submissions бачить цей журі
        if is_distributed and membership.role == "jury":
            assigned_sub_ids = JuryAssignment.objects.filter(
                tournament=tournament, juror=user
            ).values_list("submission_id", flat=True)
            submissions_qs = Submission.objects.filter(
                id__in=assigned_sub_ids
            )
        else:
            submissions_qs = Submission.objects.filter(
                task__round__tournament=tournament
            )

        submissions_qs = submissions_qs.select_related(
            "task", "task__round", "participant", "team"
        ).prefetch_related("links", "attachments")

        # Оцінки цього журі
        my_grades = Grade.objects.filter(
            juror=user,
            submission__task__round__tournament=tournament,
        )
        grades_map = {g.submission_id: g for g in my_grades}

        criteria = _criteria_for_tournament(tournament)

        return Response({
            "submissions":   [_serialize_submission(s, grades_map, is_team) for s in submissions_qs],
            "criteria":      criteria,
            "is_team":       is_team,
            "is_distributed": is_distributed,
        })


class JuryGradeView(APIView):
    """
    POST /api/tournaments/<pk>/jury/submissions/<sub_id>/grade/

    Створює або оновлює Grade.
    scores повинні містити ключі що відповідають JuryGradingCriterion.key (або 'score' для дефолту).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk, submission_pk):
        tournament = get_object_or_404(Tournament, pk=tournament_pk)
        submission = get_object_or_404(
            Submission, pk=submission_pk, task__round__tournament=tournament
        )
        user = request.user

        # Перевірка ролі
        is_jury = TournamentMember.objects.filter(
            tournament=tournament,
            user=user,
            role__in=("jury", "admin", "owner"),
        ).exists()
        if not is_jury:
            return Response({"detail": "Немає доступу."}, status=status.HTTP_403_FORBIDDEN)

        scores  = request.data.get("scores", {})
        comment = request.data.get("comment", "")

        # Валідація scores відносно критеріїв турніру
        criteria = _criteria_for_tournament(tournament)
        criteria_map = {c["key"]: c for c in criteria}

        errors = {}
        for key, criterion in criteria_map.items():
            val = scores.get(key)
            if val is None:
                errors[key] = f"Відсутній бал для критерію «{criterion['label']}»."
                continue
            try:
                num = float(val)
            except (TypeError, ValueError):
                errors[key] = f"Некоректне значення для «{criterion['label']}»."
                continue
            if num < 0 or num > criterion["max"]:
                errors[key] = f"Бал для «{criterion['label']}» має бути від 0 до {criterion['max']}."

        if errors:
            return Response({"detail": errors}, status=status.HTTP_400_BAD_REQUEST)

        # Зберігаємо тільки відомі ключі
        clean_scores = {k: float(scores[k]) for k in criteria_map if k in scores}
        total = sum(clean_scores.values())

        grade, _ = Grade.objects.update_or_create(
            submission=submission,
            juror=user,
            defaults={
                "scores":  clean_scores,
                "comment": comment,
                "total":   total,
            },
        )

        return Response({
            "id":         grade.id,
            "scores":     grade.scores,
            "comment":    grade.comment,
            "total":      grade.total,
            "updated_at": grade.updated_at.isoformat(),
        }, status=status.HTTP_200_OK)