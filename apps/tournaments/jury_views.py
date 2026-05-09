
"""
apps/tournaments/jury_views.py

GET /api/tournaments/jury/pending-submissions/

Повертає для поточного журі список турнірів з кількістю
здач що ще не мають його оцінки.

Відповідь:
[
  {
    "tournament_id":   1,
    "tournament_name": "Літній кубок",
    "pending_count":   7
  },
  ...
]

Додай у urls.py турнірів:
  from .jury_views import JuryPendingSubmissionsView
  path('jury/pending-submissions/', JuryPendingSubmissionsView.as_view(), name='jury-pending'),
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.db.models import Count, Q

from .models import Tournament, TournamentMember, Submission
from .models import Grade


class JuryPendingSubmissionsView(APIView):
    """
    Повертає турніри де поточний user є журі/owner/admin,
    та кількість submissions що він ще не оцінив.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Турніри де юзер є журі, адміном або власником
        jury_memberships = TournamentMember.objects.filter(
            user=user,
            role__in=("jury", "admin", "owner"),
        ).select_related("tournament")

        result = []

        for membership in jury_memberships:
            tournament = membership.tournament

            # Всі submissions у цьому турнірі
            all_submissions = Submission.objects.filter(
                task__round__tournament=tournament,
            )

            # Submissions що вже оцінені цим юзером
            graded_ids = Grade.objects.filter(
                juror=user,
                submission__task__round__tournament=tournament,
            ).values_list("submission_id", flat=True)

            pending_count = all_submissions.exclude(
                id__in=graded_ids
            ).count()

            # Показуємо тільки якщо є що оцінювати
            if pending_count > 0:
                result.append({
                    "tournament_id":   tournament.id,
                    "tournament_name": tournament.name,
                    "pending_count":   pending_count,
                })

        # Сортуємо: найбільше очікувань першими
        result.sort(key=lambda x: x["pending_count"], reverse=True)

        return Response(result)