"""Team tournament tests."""
from rest_framework import status
from .base import BaseTest
from apps.tournaments.models import Submission, Grade

class TeamTournamentTests(BaseTest):

    def setUp(self):
        from ..models import Team, TeamMember
        self.Team       = Team
        self.TeamMember = TeamMember

        self.owner   = self.make_user("teamowner", role="admin")
        self.captain = self.make_user("teamcap")
        self.member  = self.make_user("teammember")
        self.outsider = self.make_user("teamout")

        self.t = self.make_tournament(self.owner, t_type="team")
        self.join(self.t, self.captain)
        self.join(self.t, self.member)

        self.team = Team.objects.create(
            tournament=self.t,
            name="Test Team",
            captain=self.captain,
        )
        TeamMember.objects.create(
            team=self.team,
            user=self.member,
            status=TeamMember.STATUS_ACCEPTED,
        )

        self.r    = self.make_round(self.t)
        self.task = self.make_task(self.r)

    def _sub_url(self):
        return (
            f"/api/tournaments/{self.t.id}"
            f"/rounds/{self.r.id}"
            f"/tasks/{self.task.id}/submissions/"
        )

    def test_captain_can_submit(self):
        """Капітан може здати роботу від імені команди."""
        self.auth(self.captain)
        resp = self.client.post(self._sub_url(), {"text": "Team solution"})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        from apps.tournaments.models import Submission
        self.assertTrue(
            Submission.objects.filter(task=self.task, team=self.team).exists()
        )

    def test_member_cannot_submit(self):
        """Звичайний учасник команди не може здавати — тільки капітан."""
        self.auth(self.member)
        resp = self.client.post(self._sub_url(), {"text": "Member solution"})
        self.assertIn(resp.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN
        ])

    def test_captain_cannot_submit_twice(self):
        """Команда не може здати роботу двічі."""
        self.auth(self.captain)
        self.client.post(self._sub_url(), {"text": "First"})
        resp = self.client.post(self._sub_url(), {"text": "Second"})
        self.assertIn(resp.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN
        ])

    def test_team_tournament_leaderboard_has_team_name(self):
        """Таблиця лідерів командного турніру містить team_name."""
        jury = self.make_user("teamjury")
        self.join(self.t, jury, role="jury")
        self.auth(self.captain)
        self.client.post(self._sub_url(), {"text": "Solution"})

        from ..api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        scores = {c["key"]: 5 for c in criteria}
        sub = Submission.objects.filter(task=self.task, team=self.team).first()
        if sub:
            Grade.objects.create(submission=sub, juror=jury, scores=scores, total=sum(scores.values()))

        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        if resp.data.get("participants"):
            first = resp.data["participants"][0]
            self.assertIn("team_name", first)


# ─────────────────────────────────────────────────────────────────────────────
# 20. ANNOUNCEMENT COMMENTS
# ─────────────────────────────────────────────────────────────────────────────
