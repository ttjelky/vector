# ─────────────────────────────────────────────────────────────────────────────
# Додай ці urlpatterns у свій urls.py
# ─────────────────────────────────────────────────────────────────────────────

from django.urls import path
from .api.views.team import (
    TeamListCreateView,
    TeamDetailView,
    TeamInviteView,
    TeamMemberRemoveView,
    TeamRegisterView,
    TeamRosterLockView,
    MyTeamView,
    TeamInviteInfoView,
    TeamInviteAcceptView,
    TeamInviteDeclineView,
)
from .team_leaderboard_view import TeamLeaderboardDetailView

urlpatterns = [
    # ── В межах турніру ──────────────────────────────────────────────────────
    path(
        'tournaments/<int:tournament_pk>/teams/',
        TeamListCreateView.as_view(),
        name='team-list-create',
    ),
    path(
        'tournaments/<int:tournament_pk>/teams/<int:team_pk>/',
        TeamDetailView.as_view(),
        name='team-detail',
    ),
    path(
        'tournaments/<int:tournament_pk>/teams/<int:team_pk>/invite/',
        TeamInviteView.as_view(),
        name='team-invite-member',
    ),
    path(
        'tournaments/<int:tournament_pk>/teams/<int:team_pk>/members/<int:member_pk>/',
        TeamMemberRemoveView.as_view(),
        name='team-member-remove',
    ),
    path(
        'tournaments/<int:tournament_pk>/teams/<int:team_pk>/register/',
        TeamRegisterView.as_view(),
        name='team-register',
    ),
    path(
        'tournaments/<int:tournament_pk>/teams/<int:team_pk>/lock/',
        TeamRosterLockView.as_view(),
        name='team-roster-lock',
    ),
    path(
        'tournaments/<int:tournament_pk>/my-team/',
        MyTeamView.as_view(),
        name='my-team',
    ),

    # ── Запрошення (без tournament_pk) ───────────────────────────────────────
    path(
        'team-invite/<uuid:token>/',
        TeamInviteInfoView.as_view(),
        name='team-invite-info',
    ),
    path(
        'team-invite/<uuid:token>/accept/',
        TeamInviteAcceptView.as_view(),
        name='team-invite-accept',
    ),
    path(
        'team-invite/<uuid:token>/decline/',
        TeamInviteDeclineView.as_view(),
        name='team-invite-decline',
    ),
    path(
        'tournaments/<int:tournament_pk>/leaderboard/team/<int:team_pk>/',
        TeamLeaderboardDetailView.as_view(),
        name='team-leaderboard-detail',
    ),
]
