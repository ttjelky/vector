from django.urls import path
from .views import (
    DistributeSubmissionsView, TournamentCreateView, TournamentDetailView,
    MyTournamentRoleView,
    TournamentInviteLinkView, RegeneratePinView,
    JoinByTokenView, TournamentPreviewByTokenView, VerifyInvitePinView,
    TournamentMemberListView, TournamentMemberDeleteView,
    RoundListCreateView, RoundDetailView,
    RoundLinkListCreateView, RoundLinkDeleteView,
    RoundAttachmentListCreateView, RoundAttachmentDeleteView,
    TaskListCreateView, TaskDetailView,
    TaskLinkListCreateView, TaskLinkDeleteView,
    TaskAttachmentListCreateView, TaskAttachmentDeleteView,
    SubmissionListCreateView, SubmissionDetailView,
    SubmissionLinkCreateView, SubmissionLinkDeleteView,
    SubmissionAttachmentCreateView, SubmissionAttachmentDeleteView,
    JurySubmissionsView, JuryGradeView,
    SubmissionGradeView, ParticipantGradesNewsView,
    LeaderboardView, LeaderboardDetailView,
    RegistrationExceptionView,
)
from .team_views import (
    TeamListCreateView, TeamDetailView,
    TeamMemberView, TeamUploadPermissionView,
    AdminAssignTeamView,
)
from .jury_views import JuryPendingSubmissionsView  # ← нове

urlpatterns = [
    # ── Tournaments ────────────────────────────────────────────────────────────
    path('', TournamentCreateView.as_view(), name='tournament-list-create'),
    path('<int:pk>/', TournamentDetailView.as_view(), name='tournament-detail'),

    # ── Invite & Join ──────────────────────────────────────────────────────────
    path('<int:tournament_pk>/invite-link/', TournamentInviteLinkView.as_view(), name='tournament-invite-link'),
    path('<int:tournament_pk>/regenerate-pin/', RegeneratePinView.as_view(), name='tournament-regenerate-pin'),
    path('join/', JoinByTokenView.as_view(), name='tournament-join'),
    path('join/<uuid:token>/preview/', TournamentPreviewByTokenView.as_view(), name='tournament-join-preview'),
    path('join/<uuid:token>/verify-pin/', VerifyInvitePinView.as_view(), name='tournament-verify-pin'),

    # ── My role ────────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/my-role/', MyTournamentRoleView.as_view(), name='my-tournament-role'),

    # ── Members ────────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/members/', TournamentMemberListView.as_view(), name='tournament-members'),
    path('<int:tournament_pk>/members/<int:pk>/', TournamentMemberDeleteView.as_view(), name='tournament-member-delete'),

    # ── Teams ─────────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('<int:tournament_pk>/teams/<int:team_pk>/', TeamDetailView.as_view(), name='team-detail'),

    # ── Team members ──────────────────────────────────────────────────────────
    path('<int:tournament_pk>/teams/<int:team_pk>/members/', TeamMemberView.as_view(), name='team-member-add'),
    path('<int:tournament_pk>/teams/<int:team_pk>/members/<int:user_pk>/', TeamMemberView.as_view(), name='team-member-remove'),

    # ── Upload permissions ────────────────────────────────────────────────────
    path('<int:tournament_pk>/teams/<int:team_pk>/upload-permission/', TeamUploadPermissionView.as_view(), name='team-upload-perm-add'),
    path('<int:tournament_pk>/teams/<int:team_pk>/upload-permission/<int:user_pk>/', TeamUploadPermissionView.as_view(), name='team-upload-perm-remove'),

    # ── Admin assign ──────────────────────────────────────────────────────────
    path('<int:tournament_pk>/teams/<int:team_pk>/assign-member/', AdminAssignTeamView.as_view(), name='team-admin-assign'),

    # ── Jury panel ─────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/jury/submissions/', JurySubmissionsView.as_view(), name='jury-submissions'),
    path('<int:tournament_pk>/jury/submissions/<int:submission_pk>/grade/', JuryGradeView.as_view(), name='jury-grade'),
    path('jury/pending-submissions/', JuryPendingSubmissionsView.as_view(), name='jury-pending-submissions'),  # ← нове

    # ── Leaderboard ────────────────────────────────────────────────────────────
    path('<int:tournament_pk>/leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('<int:tournament_pk>/leaderboard/<int:participant_pk>/', LeaderboardDetailView.as_view(), name='leaderboard-detail'),

    # ── Registration exception ─────────────────────────────────────────────────
    path('<int:tournament_pk>/registration-exception/', RegistrationExceptionView.as_view(), name='registration-exception'),

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

    # ── Submissions ───────────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/submissions/', SubmissionListCreateView.as_view(), name='submission-list-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/submissions/<int:pk>/', SubmissionDetailView.as_view(), name='submission-detail'),

    # ── Submission links ──────────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/submissions/<int:submission_pk>/links/', SubmissionLinkCreateView.as_view(), name='submission-link-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/submissions/<int:submission_pk>/links/<int:pk>/', SubmissionLinkDeleteView.as_view(), name='submission-link-delete'),

    # ── Submission grade (for participant) ────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/submissions/<int:submission_pk>/grade/', SubmissionGradeView.as_view(), name='submission-grade'),

    # ── Submission attachments ────────────────────────────────────────────────
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/submissions/<int:submission_pk>/attachments/', SubmissionAttachmentCreateView.as_view(), name='submission-attachment-create'),
    path('<int:tournament_pk>/rounds/<int:round_pk>/tasks/<int:task_pk>/submissions/<int:submission_pk>/attachments/<int:pk>/', SubmissionAttachmentDeleteView.as_view(), name='submission-attachment-delete'),

    # ── My grades ─────────────────────────────────────────────────────────────
    path('my-grades/', ParticipantGradesNewsView.as_view(), name='participant-grades-news'),
    path('<int:tournament_pk>/jury/distribute/', DistributeSubmissionsView.as_view()),
]
