from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from .views import (
    TournamentCreateView, TournamentDetailView,
    MyTournamentRoleView,
    TournamentInviteLinkView, JoinByTokenView,
    TournamentPreviewByTokenView, VerifyInvitePinView,
    TournamentMemberListView, TournamentMemberDeleteView,
    RoundListCreateView, RoundDetailView,
    RoundLinkListCreateView, RoundLinkDeleteView,
    RoundAttachmentListCreateView, RoundAttachmentDeleteView,
    TaskListCreateView, TaskDetailView,
    TaskLinkListCreateView, TaskLinkDeleteView,
    TaskAttachmentListCreateView, TaskAttachmentDeleteView,
)

urlpatterns = [
    # ── Tournaments ────────────────────────────────────────────────────────────
    path('', TournamentCreateView.as_view(), name='tournament-list-create'),
    path('<int:pk>/', TournamentDetailView.as_view(), name='tournament-detail'),

    # ── Invite & Join ──────────────────────────────────────────────────────────
    path('<int:tournament_pk>/invite-link/', TournamentInviteLinkView.as_view(), name='tournament-invite-link'),
    path('join/', JoinByTokenView.as_view(), name='tournament-join'),
    path('join/<uuid:token>/preview/', TournamentPreviewByTokenView.as_view(), name='tournament-join-preview'),
    path('join/<uuid:token>/verify-pin/', VerifyInvitePinView.as_view(), name='tournament-verify-pin'),  # ← новий

    # ── My role ────────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/my-role/', MyTournamentRoleView.as_view(), name='my-tournament-role'),

    # ── Members ────────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/members/', TournamentMemberListView.as_view(), name='tournament-members'),
    path('<int:tournament_pk>/members/<int:pk>/', TournamentMemberDeleteView.as_view(), name='tournament-member-delete'),

    # ── Rounds ────────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/', RoundListCreateView.as_view(), name='round-list-create'),
    path('<int:tournament_pk>/rounds/<int:pk>/', RoundDetailView.as_view(), name='round-detail'),

    # ── Round links ───────────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/links/', RoundLinkListCreateView.as_view(), name='round-link-list-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/links/<int:pk>/', RoundLinkDeleteView.as_view(), name='round-link-delete'),

    # ── Round attachments ─────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/attachments/', RoundAttachmentListCreateView.as_view(), name='round-attachment-list-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/attachments/<int:pk>/', RoundAttachmentDeleteView.as_view(), name='round-attachment-delete'),

    # ── Tasks ─────────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/', TaskListCreateView.as_view(), name='task-list-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:pk>/', TaskDetailView.as_view(), name='task-detail'),

    # ── Task links ────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/links/', TaskLinkListCreateView.as_view(), name='task-link-list-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/links/<int:pk>/', TaskLinkDeleteView.as_view(), name='task-link-delete'),

    # ── Task attachments ──────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/attachments/', TaskAttachmentListCreateView.as_view(), name='task-attachment-list-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/attachments/<int:pk>/', TaskAttachmentDeleteView.as_view(), name='task-attachment-delete'),
]
