from rest_framework import generics
from .models import Tournament, Round
from .serializers import TournamentSerializer, RoundSerializer


class TournamentCreateView(generics.ListCreateAPIView):
    queryset         = Tournament.objects.all()
    serializer_class = TournamentSerializer


class TournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/tournaments/{id}/  — отримати турнір
    PATCH  /api/tournaments/{id}/  — часткове редагування
    PUT    /api/tournaments/{id}/  — повне редагування
    DELETE /api/tournaments/{id}/  — видалити турнір
    """
    queryset         = Tournament.objects.all()
    serializer_class = TournamentSerializer


class RoundListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/tournaments/{tournament_pk}/rounds/  — список раундів
    POST /api/tournaments/{tournament_pk}/rounds/  — створити раунд
    """
    serializer_class = RoundSerializer

    def get_queryset(self):
        return Round.objects.filter(tournament_id=self.kwargs['tournament_pk'])

    def perform_create(self, serializer):
        tournament = Tournament.objects.get(pk=self.kwargs['tournament_pk'])
        serializer.save(tournament=tournament)
