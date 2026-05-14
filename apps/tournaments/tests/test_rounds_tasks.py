"""Round and Task tests."""
from rest_framework import status
from .base import BaseTest
from apps.tournaments.models import Round

class RoundTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("roundowner", role="admin")
        self.p     = self.make_user("roundp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)

    def test_create_round_as_owner(self):
        self.auth(self.owner)
        resp = self.client.post(f"/api/tournaments/{self.t.id}/rounds/", {
            "title":       "Round 1",
            "description": "First round",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_create_round_as_participant_forbidden(self):
        self.auth(self.p)
        resp = self.client.post(f"/api/tournaments/{self.t.id}/rounds/", {
            "title": "Hack Round",
        })
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST
        ])

    def test_list_rounds(self):
        self.make_round(self.t, "R1")
        self.make_round(self.t, "R2")
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/rounds/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 2)

    def test_update_round_as_owner(self):
        r = self.make_round(self.t)
        self.auth(self.owner)
        resp = self.client.patch(
            f"/api/tournaments/{self.t.id}/rounds/{r.id}/",
            {"title": "Updated Round"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["title"], "Updated Round")

    def test_delete_round_as_owner(self):
        r = self.make_round(self.t)
        self.auth(self.owner)
        resp = self.client.delete(f"/api/tournaments/{self.t.id}/rounds/{r.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Round.objects.filter(id=r.id).exists())


# ─────────────────────────────────────────────────────────────────────────────
# 7. TASKS
# ─────────────────────────────────────────────────────────────────────────────

class TaskTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("taskowner", role="admin")
        self.p     = self.make_user("taskp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)
        self.r     = self.make_round(self.t)

    def test_create_task_as_owner(self):
        self.auth(self.owner)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/rounds/{self.r.id}/tasks/",
            {"title": "Task A", "description": "Do something"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_create_task_as_participant_forbidden(self):
        self.auth(self.p)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/rounds/{self.r.id}/tasks/",
            {"title": "Hack Task"},
        )
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST
        ])

    def test_list_tasks(self):
        self.make_task(self.r, "T1")
        self.make_task(self.r, "T2")
        self.auth(self.p)
        resp = self.client.get(
            f"/api/tournaments/{self.t.id}/rounds/{self.r.id}/tasks/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 2)

    def test_delete_task_as_owner(self):
        task = self.make_task(self.r)
        self.auth(self.owner)
        resp = self.client.delete(
            f"/api/tournaments/{self.t.id}/rounds/{self.r.id}/tasks/{task.id}/"
        )
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
# 8. SUBMISSIONS
# ─────────────────────────────────────────────────────────────────────────────
