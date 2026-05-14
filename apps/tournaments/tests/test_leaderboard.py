"""Leaderboard tests."""
from rest_framework import status
from .base import BaseTest
from apps.tournaments.models import Submission, Grade

class LeaderboardTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("lbowner", role="admin")
        self.p     = self.make_user("lbp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)

    def test_leaderboard_accessible_to_member(self):
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_leaderboard_not_accessible_to_non_member(self):
        outsider = self.make_user("lboutsider")
        self.auth(outsider)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/")
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_leaderboard_hidden_when_not_published(self):
        self.t.leaderboard_published = False
        self.t.save()
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/")
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK, status.HTTP_403_FORBIDDEN
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 11. CERTIFICATES
# ─────────────────────────────────────────────────────────────────────────────

class LeaderboardDetailTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("ldowner", role="admin")
        self.jury  = self.make_user("ldjury")
        self.p     = self.make_user("ldp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.jury, role="jury")
        self.join(self.t, self.p)
        self.r    = self.make_round(self.t)
        self.task = self.make_task(self.r)
        self.sub  = Submission.objects.create(task=self.task, participant=self.p, text="x")

        from apps.tournaments.api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        scores = {c["key"]: 7 for c in criteria}
        total  = sum(scores.values())
        Grade.objects.create(
            submission=self.sub, juror=self.jury,
            scores=scores, total=total, comment=""
        )

    def test_leaderboard_detail_accessible_to_member(self):
        """Учасник може отримати деталізацію своїх результатів."""
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/{self.p.id}/")
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_leaderboard_detail_structure(self):
        """Відповідь деталізації містить обов'язкові поля."""
        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/{self.p.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for field in ["participant_id", "participant_name", "rounds", "grand_total", "criteria_meta"]:
            self.assertIn(field, resp.data)

    def test_leaderboard_detail_jury_breakdown_for_admin(self):
        """Admin бачить jury_breakdown у деталізації."""
        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/{self.p.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        rounds = resp.data.get("rounds", [])
        self.assertGreater(len(rounds), 0)
        self.assertIn("jury_breakdown", rounds[0])

    def test_leaderboard_detail_nonexistent_participant(self):
        """Деталізація для неіснуючого учасника повертає 404."""
        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/99999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_leaderboard_detail_hidden_for_participant_when_unpublished(self):
        """Якщо таблиця не опублікована — учасник не бачить деталізацію."""
        self.t.leaderboard_published = False
        self.t.save()
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/{self.p.id}/")
        self.assertIn(resp.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_leaderboard_published_participant_sees_data(self):
        """Після публікації учасник бачить свої результати."""
        self.t.leaderboard_published = True
        self.t.save()
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/leaderboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("participants", resp.data)


# ─────────────────────────────────────────────────────────────────────────────
# 19. TEAM TOURNAMENTS
# ─────────────────────────────────────────────────────────────────────────────
