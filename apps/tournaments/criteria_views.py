"""
apps/tournaments/criteria_views.py

Ендпоінти для керування критеріями оцінювання журі.

Додай у urls.py турнірів:
  from .criteria_views import (
      TournamentCriteriaView,
      TournamentCriterionDetailView,
  )
  path('tournaments/<int:pk>/criteria/',        TournamentCriteriaView.as_view(),        name='tournament-criteria'),
  path('tournaments/<int:pk>/criteria/<int:cid>/', TournamentCriterionDetailView.as_view(), name='tournament-criterion-detail'),
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers, status

from django.shortcuts import get_object_or_404
from django.utils.text import slugify

from .models import Tournament, TournamentMember, JuryGradingCriterion


# ── Serializer ────────────────────────────────────────────────────────────────

class CriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = JuryGradingCriterion
        fields = ["id", "key", "label", "max_score", "group", "hint", "order"]

    def validate_max_score(self, value):
        if value < 1 or value > 1000:
            raise serializers.ValidationError("max_score має бути від 1 до 1000.")
        return value


# ── Helpers ───────────────────────────────────────────────────────────────────

def _assert_privileged(user, tournament):
    """Піднімає PermissionDenied якщо юзер не є owner/admin турніру."""
    from rest_framework.exceptions import PermissionDenied
    is_privileged = TournamentMember.objects.filter(
        tournament=tournament,
        user=user,
        role__in=("owner", "admin"),
    ).exists()
    if not is_privileged:
        raise PermissionDenied("Тільки власник або адміністратор може змінювати критерії.")


def _unique_key(base_key: str, tournament: Tournament, exclude_id=None) -> str:
    """
    Генерує унікальний slug-ключ у межах турніру.
    Якщо 'originality' вже є → 'originality-2', 'originality-3' і т.д.
    """
    key   = slugify(base_key) or "criterion"
    qs    = JuryGradingCriterion.objects.filter(tournament=tournament, key=key)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    if not qs.exists():
        return key
    i = 2
    while True:
        candidate = f"{key}-{i}"
        qs2 = JuryGradingCriterion.objects.filter(tournament=tournament, key=candidate)
        if exclude_id:
            qs2 = qs2.exclude(id=exclude_id)
        if not qs2.exists():
            return candidate
        i += 1


# ── Views ─────────────────────────────────────────────────────────────────────

class TournamentCriteriaView(APIView):
    """
    GET  /api/tournaments/<pk>/criteria/          → список критеріїв
    POST /api/tournaments/<pk>/criteria/          → створити критерій
    PUT  /api/tournaments/<pk>/criteria/          → замінити ВСІ критерії одразу (bulk replace)
    """
    permission_classes = [IsAuthenticated]

    def _tournament(self, pk):
        return get_object_or_404(Tournament, pk=pk)

    def get(self, request, pk):
        tournament = self._tournament(pk)
        criteria   = tournament.grading_criteria.all()
        return Response(CriterionSerializer(criteria, many=True).data)

    def post(self, request, pk):
        tournament = self._tournament(pk)
        _assert_privileged(request.user, tournament)

        data = request.data.copy()
        # Авто-генерація ключа з label якщо не вказано
        if not data.get("key") and data.get("label"):
            data["key"] = _unique_key(data["label"], tournament)
        else:
            data["key"] = _unique_key(data.get("key", "criterion"), tournament)

        data["order"] = data.get(
            "order",
            (tournament.grading_criteria.order_by("-order").values_list("order", flat=True).first() or -1) + 1,
        )

        serializer = CriterionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        criterion = serializer.save(tournament=tournament)
        return Response(CriterionSerializer(criterion).data, status=status.HTTP_201_CREATED)

    def put(self, request, pk):
        """
        Bulk replace — приймає список критеріїв і замінює всі одразу.
        Використовується при збереженні форми створення/редагування турніру.

        Body: [
          {"label": "Оригінальність", "max_score": 10, "group": "", "hint": "", "order": 0},
          ...
        ]
        """
        tournament = self._tournament(pk)
        _assert_privileged(request.user, tournament)

        items = request.data
        if not isinstance(items, list):
            return Response({"detail": "Очікується масив критеріїв."}, status=status.HTTP_400_BAD_REQUEST)

        # Видаляємо старі
        tournament.grading_criteria.all().delete()

        created = []
        for i, item in enumerate(items):
            data = dict(item)
            label = data.get("label", "").strip()
            if not label:
                continue
            # Авто-ключ
            data["key"]   = _unique_key(data.get("key") or label, tournament)
            data["order"] = data.get("order", i)
            s = CriterionSerializer(data=data)
            s.is_valid(raise_exception=True)
            created.append(s.save(tournament=tournament))

        return Response(CriterionSerializer(created, many=True).data, status=status.HTTP_200_OK)


class TournamentCriterionDetailView(APIView):
    """
    GET    /api/tournaments/<pk>/criteria/<cid>/  → один критерій
    PATCH  /api/tournaments/<pk>/criteria/<cid>/  → оновити критерій
    DELETE /api/tournaments/<pk>/criteria/<cid>/  → видалити критерій
    """
    permission_classes = [IsAuthenticated]

    def _get(self, pk, cid):
        tournament = get_object_or_404(Tournament, pk=pk)
        criterion  = get_object_or_404(JuryGradingCriterion, pk=cid, tournament=tournament)
        return tournament, criterion

    def get(self, request, pk, cid):
        _, criterion = self._get(pk, cid)
        return Response(CriterionSerializer(criterion).data)

    def patch(self, request, pk, cid):
        tournament, criterion = self._get(pk, cid)
        _assert_privileged(request.user, tournament)

        data = request.data.copy()
        if "key" in data:
            data["key"] = _unique_key(data["key"], tournament, exclude_id=cid)

        serializer = CriterionSerializer(criterion, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CriterionSerializer(criterion).data)

    def delete(self, request, pk, cid):
        tournament, criterion = self._get(pk, cid)
        _assert_privileged(request.user, tournament)
        criterion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
