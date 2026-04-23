from django.urls import path
from .views import TournamentCreateView

urlpatterns = [
    path('', TournamentCreateView.as_view(), name='tournament-create'),
]