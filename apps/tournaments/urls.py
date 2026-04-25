from django.urls import path
from django.conf import settings
from .views import TournamentCreateView, TournamentDetailView, RoundListCreateView
from django.conf.urls.static import static

urlpatterns = [
    path('', TournamentCreateView.as_view(), name='tournament-create'),
    path('<int:pk>/', TournamentDetailView.as_view(), name='tournament-detail'),
    path('<int:tournament_pk>/rounds/', RoundListCreateView.as_view(), name='round-list-create'),
]
