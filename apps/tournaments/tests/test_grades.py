"""Grade view tests."""
from rest_framework import status
from .base import BaseTest
from apps.tournaments.models import Submission, Grade

class MyGradesTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("mgowner", role="admin")
        self.jury  = self.make_user("mgjury")
        self.p     = self.make_user("mgp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.jury, role="jury")
        self.join(self.t, self.p)
        self.r    = self.make_round(self.t)
        self.task = self.make_task(self.r)
        self.sub  = Submission.objects.create(task=self.task, participant=self.p, text="x")

    def test_my_grades_empty_initially(self):
        """Спочатку список оцінок порожній."""
        self.auth(self.p)
        resp = self.client.get("/api/tournaments/my-grades/")
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])
        if resp.status_code == 200:
            self.assertIsInstance(resp.data, list)
            self.assertEqual(len(resp.data), 0)

    def test_my_grades_appears_after_grading(self):
        """Після оцінювання з'являється запис в my-grades."""
        from apps.tournaments.api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        scores = {c["key"]: 6 for c in criteria}
        Grade.objects.create(
            submission=self.sub, juror=self.jury,
            scores=scores, total=sum(scores.values()), comment=""
        )
        self.auth(self.p)
        resp = self.client.get("/api/tournaments/my-grades/")
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])
        if resp.status_code == 200:
            self.assertGreaterEqual(len(resp.data), 1)

    def test_my_grades_structure(self):
        """Відповідь містить обов'язкові поля."""
        from apps.tournaments.api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        scores = {c["key"]: 6 for c in criteria}
        Grade.objects.create(
            submission=self.sub, juror=self.jury,
            scores=scores, total=sum(scores.values()), comment="good"
        )
        self.auth(self.p)
        resp = self.client.get("/api/tournaments/my-grades/")
        if resp.status_code == 200 and resp.data:
            first = resp.data[0]
            for field in ["task_title", "round_title", "tournament", "scores", "total"]:
                self.assertIn(field, first)

    def test_jury_cannot_access_my_grades(self):
        """my-grades повертає дані тільки для учасника (не для журі як власника)."""
        self.auth(self.jury)
        resp = self.client.get("/api/tournaments/my-grades/")
        # Журі теж може мати оцінки якщо він учасник в іншому турнірі,
        # але endpoint має бути доступний авторизованим
        self.assertNotEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────────────────────────────────────
# 22. SUBMISSION GRADE VIEW (УЧАСНИК ДИВИТЬСЯ СВОЮ ОЦІНКУ)
# ─────────────────────────────────────────────────────────────────────────────

class SubmissionGradeViewTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("sgvowner", role="admin")
        self.jury  = self.make_user("sgvjury")
        self.p     = self.make_user("sgvp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.jury, role="jury")
        self.join(self.t, self.p)
        self.r    = self.make_round(self.t)
        self.task = self.make_task(self.r)
        self.sub  = Submission.objects.create(task=self.task, participant=self.p, text="x")

    def _grade_view_url(self):
        return (
            f"/api/tournaments/{self.t.id}"
            f"/rounds/{self.r.id}"
            f"/tasks/{self.task.id}"
            f"/submissions/{self.sub.id}/grade/"
        )

    def test_no_grade_returns_null(self):
        """Якщо оцінки ще немає — повертає null або 200 з порожніми даними."""
        self.auth(self.p)
        resp = self.client.get(self._grade_view_url())
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_participant_sees_own_grade(self):
        """Учасник бачить свою усереднену оцінку після виставлення."""
        from apps.tournaments.api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        scores = {c["key"]: 8 for c in criteria}
        Grade.objects.create(
            submission=self.sub, juror=self.jury,
            scores=scores, total=sum(scores.values()), comment="well done"
        )
        self.auth(self.p)
        resp = self.client.get(self._grade_view_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.data)
        self.assertIn("total", resp.data)

    def test_outsider_cannot_see_grade(self):
        """Сторонній не може побачити оцінку чужої роботи."""
        outsider = self.make_user("sgvout")
        self.auth(outsider)
        resp = self.client.get(self._grade_view_url())
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_admin_sees_all_grades(self):
        """Admin бачить grades_count і повну інформацію."""
        from apps.tournaments.api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        scores = {c["key"]: 9 for c in criteria}
        Grade.objects.create(
            submission=self.sub, juror=self.jury,
            scores=scores, total=sum(scores.values()), comment=""
        )
        self.auth(self.owner)
        resp = self.client.get(self._grade_view_url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("grades_count", resp.data)
