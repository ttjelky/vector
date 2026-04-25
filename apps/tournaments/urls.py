from django.urls import path
from .views import TournamentCreateView, TournamentDetailView

urlpatterns = [
    path('', TournamentCreateView.as_view(), name='tournament-create'),
    path('<int:pk>/', TournamentDetailView.as_view(), name='tournament-detail'),
]