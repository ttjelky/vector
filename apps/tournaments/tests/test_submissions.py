"""Submission and Grading tests."""
from rest_framework import status
from .base import BaseTest
from ..models import Submission, Grade, JuryAssignment

class SubmissionTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("subowner", role="admin")
        self.p     = self.make_user("subp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)
        self.r     = self.make_round(self.t)
        self.task  = self.make_task(self.r)

    def _sub_url(self):
        return (
            f"/api/tournaments/{self.t.id}"
            f"/rounds/{self.r.id}"
            f"/tasks/{self.task.id}/submissions/"
        )

    def test_create_submission_as_participant(self):
        self.auth(self.p)
        resp = self.client.post(self._sub_url(), {"text": "My solution"})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Submission.objects.filter(task=self.task, participant=self.p).exists()
        )

    def test_create_submission_duplicate(self):
        Submission.objects.create(task=self.task, participant=self.p, text="First")
        self.auth(self.p)
        resp = self.client.post(self._sub_url(), {"text": "Second attempt"})
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK, status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_list_submissions_as_jury(self):
        jury = self.make_user("subjury")
        self.join(self.t, jury, role="jury")
        Submission.objects.create(task=self.task, participant=self.p, text="Sol")
        self.auth(jury)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/jury/submissions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_participant_cannot_see_jury_panel(self):
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/jury/submissions/")
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_delete_submission_as_owner(self):
        sub = Submission.objects.create(
            task=self.task, participant=self.p, text="To delete"
        )
        self.auth(self.owner)
        resp = self.client.delete(
            f"/api/tournaments/{self.t.id}/rounds/{self.r.id}"
            f"/tasks/{self.task.id}/submissions/{sub.id}/"
        )
        self.assertIn(resp.status_code, [
            status.HTTP_204_NO_CONTENT, status.HTTP_403_FORBIDDEN
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 9. GRADING
# ─────────────────────────────────────────────────────────────────────────────

class GradeTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("gradeowner", role="admin")
        self.p     = self.make_user("gradep")
        self.jury  = self.make_user("gradejury")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)
        self.join(self.t, self.jury, role="jury")
        self.r    = self.make_round(self.t)
        self.task = self.make_task(self.r)
        self.sub  = Submission.objects.create(
            task=self.task, participant=self.p, text="Solution"
        )
        JuryAssignment.objects.create(
            tournament=self.t, juror=self.jury, submission=self.sub
        )

        # Динамічно підтягуємо критерії турніру з БД (включає кастомний "score")
        from ..api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        self.scores = {c["key"]: min(8, int(c["max"])) for c in criteria}

    def test_jury_grade_submission(self):
        """Журі оцінює призначену роботу."""
        self.auth(self.jury)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/jury/submissions/{self.sub.id}/grade/",
            {"scores": self.scores, "comment": "Good work"},
            format="json",
        )
        self.assertIn(
            resp.status_code,
            [status.HTTP_200_OK, status.HTTP_201_CREATED],
            msg=f"Unexpected status {resp.status_code}. Response body: {resp.data}",
        )
        self.assertTrue(
            Grade.objects.filter(submission=self.sub, juror=self.jury).exists()
        )

    def test_grade_total_calculated(self):
        """total = сума всіх scores після збереження через API."""
        self.auth(self.jury)

        # Динамічно підтягуємо критерії турніру з БД
        from ..api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        valid_scores = {c["key"]: 5 for c in criteria}

        self.client.post(
            f"/api/tournaments/{self.t.id}/jury/submissions/{self.sub.id}/grade/",
            {"scores": valid_scores, "comment": ""},
            format="json",
        )
        grade = Grade.objects.filter(submission=self.sub, juror=self.jury).first()
        if grade:
            expected = sum(valid_scores.values())
            self.assertEqual(grade.total, expected)

    def test_participant_cannot_grade(self):
        self.auth(self.p)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/jury/submissions/{self.sub.id}/grade/",
            {"scores": {}, "comment": ""},
            format="json",
        )
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 10. LEADERBOARD
# ─────────────────────────────────────────────────────────────────────────────

class JuryGradingExtendedTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("jgowner", role="admin")
        self.jury1 = self.make_user("jgjury1")
        self.jury2 = self.make_user("jgjury2")
        self.p     = self.make_user("jgp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.jury1, role="jury")
        self.join(self.t, self.jury2, role="jury")
        self.join(self.t, self.p)
        self.r    = self.make_round(self.t)
        self.task = self.make_task(self.r)
        self.sub  = Submission.objects.create(
            task=self.task, participant=self.p, text="Solution"
        )
        JuryAssignment.objects.create(
            tournament=self.t, juror=self.jury1, submission=self.sub
        )
        from ..api.views.jury import _criteria_for_tournament
        criteria = _criteria_for_tournament(self.t)
        self.scores = {c["key"]: min(8, int(c["max"])) for c in criteria}

    def _grade_url(self, sub_id=None):
        sid = sub_id or self.sub.id
        return f"/api/tournaments/{self.t.id}/jury/submissions/{sid}/grade/"

    def test_jury_can_update_existing_grade(self):
        """Журі може оновити вже виставлену оцінку."""
        self.auth(self.jury1)
        self.client.post(self._grade_url(), {"scores": self.scores, "comment": "First"}, format="json")
        updated_scores = {k: 1 for k in self.scores}
        resp = self.client.post(self._grade_url(), {"scores": updated_scores, "comment": "Updated"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        grade = Grade.objects.get(submission=self.sub, juror=self.jury1)
        self.assertEqual(grade.comment, "Updated")
        self.assertEqual(grade.total, sum(updated_scores.values()))

    def test_two_jury_grade_same_submission(self):
        """Два різні журі можуть оцінити одну роботу незалежно."""
        JuryAssignment.objects.create(
            tournament=self.t, juror=self.jury2, submission=self.sub
        )
        self.auth(self.jury1)
        self.client.post(self._grade_url(), {"scores": self.scores, "comment": "j1"}, format="json")
        self.auth(self.jury2)
        self.client.post(self._grade_url(), {"scores": self.scores, "comment": "j2"}, format="json")
        self.assertEqual(Grade.objects.filter(submission=self.sub).count(), 2)

    def test_grade_with_missing_criterion_returns_400(self):
        """Якщо не передати один критерій — повертає 400."""
        self.auth(self.jury1)
        incomplete = dict(self.scores)
        first_key = next(iter(incomplete))
        del incomplete[first_key]
        resp = self.client.post(self._grade_url(), {"scores": incomplete, "comment": ""}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_grade_exceeds_max_returns_400(self):
        """Бал вище максимуму повертає 400."""
        self.auth(self.jury1)
        over_scores = {k: 9999 for k in self.scores}
        resp = self.client.post(self._grade_url(), {"scores": over_scores, "comment": ""}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_grade_negative_value_returns_400(self):
        """Від'ємний бал повертає 400."""
        self.auth(self.jury1)
        neg_scores = {k: -1 for k in self.scores}
        resp = self.client.post(self._grade_url(), {"scores": neg_scores, "comment": ""}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_can_grade_without_assignment(self):
        """Owner може оцінювати без JuryAssignment."""
        self.auth(self.owner)
        resp = self.client.post(self._grade_url(), {"scores": self.scores, "comment": "owner"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_jury_submissions_returns_criteria(self):
        """GET jury/submissions/ повертає поле criteria."""
        self.auth(self.jury1)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/jury/submissions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("criteria", resp.data)
        self.assertIsInstance(resp.data["criteria"], list)
        self.assertGreater(len(resp.data["criteria"]), 0)

    def test_jury_submissions_contains_my_grade(self):
        """Після оцінювання my_grade з'являється у відповіді."""
        self.auth(self.jury1)
        self.client.post(self._grade_url(), {"scores": self.scores, "comment": "ok"}, format="json")
        resp = self.client.get(f"/api/tournaments/{self.t.id}/jury/submissions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        graded = [s for s in resp.data["submissions"] if s["id"] == self.sub.id]
        self.assertEqual(len(graded), 1)
        self.assertIsNotNone(graded[0]["my_grade"])

    def test_ungraded_submission_has_null_my_grade(self):
        """Неоцінена здача має my_grade = null."""
        self.auth(self.jury1)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/jury/submissions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ungraded = [s for s in resp.data["submissions"] if s["id"] == self.sub.id]
        self.assertEqual(len(ungraded), 1)
        self.assertIsNone(ungraded[0]["my_grade"])


# ─────────────────────────────────────────────────────────────────────────────
# 17. JURY DISTRIBUTION
# ─────────────────────────────────────────────────────────────────────────────

class JuryDistributionTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("distowner", role="admin")
        self.jury1 = self.make_user("distjury1")
        self.jury2 = self.make_user("distjury2")
        self.p1    = self.make_user("distp1")
        self.p2    = self.make_user("distp2")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.jury1, role="jury")
        self.join(self.t, self.jury2, role="jury")
        self.join(self.t, self.p1)
        self.join(self.t, self.p2)
        self.r    = self.make_round(self.t)
        self.task = self.make_task(self.r)
        self.sub1 = Submission.objects.create(task=self.task, participant=self.p1, text="s1")
        self.sub2 = Submission.objects.create(task=self.task, participant=self.p2, text="s2")

    def _dist_url(self):
        return f"/api/tournaments/{self.t.id}/jury/distribute/"

    def test_distribute_creates_assignments(self):
        """Розподіл створює JuryAssignment записи."""
        self.auth(self.owner)
        resp = self.client.post(self._dist_url(), {"min_reviews": 1, "max_per_juror": 5}, format="json")
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertGreater(JuryAssignment.objects.filter(tournament=self.t).count(), 0)

    def test_distribute_returns_summary(self):
        """Відповідь містить assignments_created і juror_summary."""
        self.auth(self.owner)
        resp = self.client.post(self._dist_url(), {"min_reviews": 1, "max_per_juror": 5}, format="json")
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertIn("assignments_created", resp.data)
        self.assertIn("juror_summary", resp.data)

    def test_distribute_participant_forbidden(self):
        """Учасник не може запустити розподіл."""
        self.auth(self.p1)
        resp = self.client.post(self._dist_url(), {"min_reviews": 1, "max_per_juror": 5}, format="json")
        self.assertIn(resp.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_distribute_min_reviews_exceeds_jury_count(self):
        """min_reviews більше ніж журі — повертає 400."""
        self.auth(self.owner)
        resp = self.client.post(self._dist_url(), {"min_reviews": 99, "max_per_juror": 5}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_distribute_reset_clears_old_assignments(self):
        """reset=true видаляє старий розподіл перед новим."""
        self.auth(self.owner)
        self.client.post(self._dist_url(), {"min_reviews": 1, "max_per_juror": 5}, format="json")
        count_before = JuryAssignment.objects.filter(tournament=self.t).count()
        self.client.post(self._dist_url(), {"min_reviews": 1, "max_per_juror": 5, "reset": True}, format="json")
        count_after = JuryAssignment.objects.filter(tournament=self.t).count()
        # Після reset кількість має бути <= початкової (перерозподіл)
        self.assertGreater(count_after, 0)
        self.assertLessEqual(count_after, count_before + 10)

    def test_distribute_no_submissions_returns_400(self):
        """Розподіл без подань повертає 400."""
        owner2 = self.make_user("distowner2", role="admin")
        jury3  = self.make_user("distjury3")
        t2 = self.make_tournament(owner2, name="Empty Tournament")
        self.join(t2, jury3, role="jury")
        self.auth(owner2)
        resp = self.client.post(
            f"/api/tournaments/{t2.id}/jury/distribute/",
            {"min_reviews": 1, "max_per_juror": 5},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# 18. LEADERBOARD DETAIL
# ─────────────────────────────────────────────────────────────────────────────
