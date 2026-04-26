from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView

from .models import Tournament, Round, RoundLink, RoundAttachment, Task, TaskLink, TaskAttachment
from .serializers import (
    TournamentSerializer, RoundSerializer,
    RoundLinkSerializer, RoundAttachmentSerializer,
    TaskSerializer, TaskLinkSerializer, TaskAttachmentSerializer,
)


class TournamentCreateView(generics.ListCreateAPIView):
    queryset         = Tournament.objects.all()
    serializer_class = TournamentSerializer


class TournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/tournaments/{id}/   — отримати турнір
    PATCH  /api/tournaments/{id}/   — часткове редагування
    PUT    /api/tournaments/{id}/   — повне редагування
    DELETE /api/tournaments/{id}/   — видалити турнір
    """
    queryset         = Tournament.objects.all()
    serializer_class = TournamentSerializer


# ─── Round views ───────────────────────────────────────────────────────────────

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


class RoundDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/tournaments/{tournament_pk}/rounds/{pk}/  — отримати раунд
    PATCH  /api/tournaments/{tournament_pk}/rounds/{pk}/  — редагувати раунд
    DELETE /api/tournaments/{tournament_pk}/rounds/{pk}/  — видалити раунд
    """
    serializer_class = RoundSerializer

    def get_queryset(self):
        return Round.objects.filter(tournament_id=self.kwargs['tournament_pk'])


# ─── Round links views ─────────────────────────────────────────────────────────

class RoundLinkListCreateView(generics.ListCreateAPIView):
    """
    POST /api/tournaments/{tournament_pk}/rounds/{round_pk}/links/
    """
    serializer_class = RoundLinkSerializer

    def get_queryset(self):
        return RoundLink.objects.filter(round_id=self.kwargs['round_pk'])

    def perform_create(self, serializer):
        round_obj = Round.objects.get(pk=self.kwargs['round_pk'])
        serializer.save(round=round_obj)


class RoundLinkDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/tournaments/{tournament_pk}/rounds/{round_pk}/links/{pk}/
    """
    serializer_class = RoundLinkSerializer

    def get_queryset(self):
        return RoundLink.objects.filter(round_id=self.kwargs['round_pk'])


# ─── Round attachments views ───────────────────────────────────────────────────

class RoundAttachmentListCreateView(generics.ListCreateAPIView):
    """
    POST /api/tournaments/{tournament_pk}/rounds/{round_pk}/attachments/
    """
    serializer_class = RoundAttachmentSerializer
    parser_classes   = [MultiPartParser, FormParser]

    def get_queryset(self):
        return RoundAttachment.objects.filter(round_id=self.kwargs['round_pk'])

    def perform_create(self, serializer):
        round_obj = Round.objects.get(pk=self.kwargs['round_pk'])
        serializer.save(round=round_obj)


class RoundAttachmentDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/tournaments/{tournament_pk}/rounds/{round_pk}/attachments/{pk}/
    """
    serializer_class = RoundAttachmentSerializer

    def get_queryset(self):
        return RoundAttachment.objects.filter(round_id=self.kwargs['round_pk'])


# ─── Task views ────────────────────────────────────────────────────────────────

class TaskListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/tournaments/{tournament_pk}/rounds/{round_pk}/tasks/
    POST /api/tournaments/{tournament_pk}/rounds/{round_pk}/tasks/
    """
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(round_id=self.kwargs['round_pk'])

    def perform_create(self, serializer):
        round_obj = Round.objects.get(pk=self.kwargs['round_pk'])
        serializer.save(round=round_obj)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    PATCH  /api/tournaments/{tournament_pk}/rounds/{round_pk}/tasks/{pk}/
    DELETE /api/tournaments/{tournament_pk}/rounds/{round_pk}/tasks/{pk}/
    """
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(round_id=self.kwargs['round_pk'])


# ─── Task links views ──────────────────────────────────────────────────────────

class TaskLinkListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskLinkSerializer

    def get_queryset(self):
        return TaskLink.objects.filter(task_id=self.kwargs['task_pk'])

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        serializer.save(task=task)


class TaskLinkDeleteView(generics.DestroyAPIView):
    serializer_class = TaskLinkSerializer

    def get_queryset(self):
        return TaskLink.objects.filter(task_id=self.kwargs['task_pk'])


# ─── Task attachments views ────────────────────────────────────────────────────

class TaskAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskAttachmentSerializer
    parser_classes   = [MultiPartParser, FormParser]

    def get_queryset(self):
        return TaskAttachment.objects.filter(task_id=self.kwargs['task_pk'])

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs['task_pk'])
        serializer.save(task=task)


class TaskAttachmentDeleteView(generics.DestroyAPIView):
    serializer_class = TaskAttachmentSerializer

    def get_queryset(self):
        return TaskAttachment.objects.filter(task_id=self.kwargs['task_pk'])
