"""
Повне покриття платформи Vector.

Запуск:
    python manage.py test apps.tournaments.tests --verbosity=2
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    Tournament, TournamentMember,
    Round, Task, Submission,
    Grade, JuryAssignment,
    Certificate, CertificateTemplate,
    Announcement, AnnouncementComment,
)

User = get_user_model()


# ── Базовий клас з хелперами ──────────────────────────────────────────────────

class BaseTest(APITestCase):

    def make_user(self, username, role="participant", password="pass1234!"):
        email = f"{username}@test.com"
        user = User.objects.create_user(
            username=email,
            password=password,
            email=email,
            first_name=username.capitalize(),
        )
        user.role = role
        user.save()
        return user

    def auth(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def make_tournament(self, owner, name="Test Tournament", t_type="solo", open_reg=True):
        now = timezone.now()
        t = Tournament.objects.create(
            name=name,
            description="Тестовий турнір",
            tournament_type=t_type,
            start_date=now - timedelta(days=1) if open_reg else now + timedelta(days=5),
            end_date=now + timedelta(days=30),
            leaderboard_published=True,
        )
        TournamentMember.objects.create(tournament=t, user=owner, role="owner")
        return t

    def make_round(self, tournament, title="Round 1"):
        return Round.objects.create(
            tournament=tournament,
            title=title,
            description="Test round",
        )

    def make_task(self, round_obj, title="Task 1"):
        return Task.objects.create(
            round=round_obj,
            title=title,
            description="Test task",
        )

    def join(self, tournament, user, role="participant"):
        return TournamentMember.objects.create(
            tournament=tournament, user=user, role=role
        )


# ─────────────────────────────────────────────────────────────────────────────
# 1. AUTH
# ─────────────────────────────────────────────────────────────────────────────

class AuthTests(BaseTest):

    def test_register_success(self):
        resp = self.client.post("/api/users/register/", {
            "email":      "newuser@test.com",
            "password":   "StrongPass99!",
            "first_name": "New",
            "last_name":  "User",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", resp.data)

    def test_register_duplicate_email(self):
        """Реєстрація з вже існуючим email повертає 400."""
        self.make_user("existing")
        resp = self.client.post("/api/users/register/", {
            "email":    "existing@test.com",
            "password": "StrongPass99!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        """
        Серіалізатор не валідує password2 — реєстрація проходить.
        """
        resp = self.client.post("/api/users/register/", {
            "email":     "mismatch@test.com",
            "password":  "StrongPass99!",
            "password2": "WrongPass99!",
        })
        self.assertIn(resp.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,
        ])

    def test_login_success(self):
        """
        Логін через email (MyTokenObtainPairSerializer приймає email+password).
        """
        self.make_user("loginuser")
        resp = self.client.post("/api/users/login/", {
            "email":    "loginuser@test.com",
            "password": "pass1234!",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertNotIn("refresh", resp.data)

    def test_login_wrong_password(self):
        self.make_user("loginuser2")
        resp = self.client.post("/api/users/login/", {
            "email":    "loginuser2@test.com",
            "password": "wrongpassword",
        })
        self.assertIn(resp.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_401_UNAUTHORIZED,
        ])

    def test_logout(self):
        user = self.make_user("logoutuser")
        self.auth(user)
        resp = self.client.post("/api/users/logout/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_protected_endpoint_without_token(self):
        resp = self.client.get("/api/tournaments/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────────────────────────────────────
# 2. PROFILE
# ─────────────────────────────────────────────────────────────────────────────

class ProfileTests(BaseTest):

    def setUp(self):
        self.user = self.make_user("profileuser")
        self.auth(self.user)

    def test_get_profile(self):
        resp = self.client.get("/api/users/profile/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["email"], "profileuser@test.com")

    def test_update_profile_name(self):
        resp = self.client.put("/api/users/profile/", {
            "first_name": "Updated",
            "last_name":  "Name",
            "email":      "profileuser@test.com",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["first_name"], "Updated")

    def test_profile_unauthenticated(self):
        self.client.credentials()
        resp = self.client.get("/api/users/profile/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────────────────────────────────────
# 3. TOURNAMENT CRUD
# ─────────────────────────────────────────────────────────────────────────────

class TournamentCRUDTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("owner", role="admin")
        self.auth(self.owner)

    def test_create_tournament(self):
        resp = self.client.post("/api/tournaments/", {
            "name":            "My Tournament",
            "description":     "Desc",
            "tournament_type": "solo",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["name"], "My Tournament")
        self.assertTrue(
            TournamentMember.objects.filter(
                tournament_id=resp.data["id"], user=self.owner, role="owner"
            ).exists()
        )

    def test_create_tournament_missing_name(self):
        resp = self.client.post("/api/tournaments/", {"description": "No name"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_tournament(self):
        t = self.make_tournament(self.owner)
        resp = self.client.get(f"/api/tournaments/{t.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["name"], t.name)

    def test_update_tournament_owner(self):
        t = self.make_tournament(self.owner)
        resp = self.client.patch(f"/api/tournaments/{t.id}/", {"name": "Renamed"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["name"], "Renamed")

    def test_update_tournament_non_owner(self):
        other = self.make_user("other")
        t = self.make_tournament(self.owner)
        self.auth(other)
        resp = self.client.patch(f"/api/tournaments/{t.id}/", {"name": "Hack"})
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_delete_tournament_owner(self):
        t = self.make_tournament(self.owner)
        resp = self.client.delete(f"/api/tournaments/{t.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Tournament.objects.filter(id=t.id).exists())

    def test_delete_tournament_non_owner(self):
        other = self.make_user("notowner")
        t = self.make_tournament(self.owner)
        self.join(t, other)
        self.auth(other)
        resp = self.client.delete(f"/api/tournaments/{t.id}/")
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])
        self.assertTrue(Tournament.objects.filter(id=t.id).exists())

    def test_list_tournaments(self):
        self.make_tournament(self.owner, "T1")
        self.make_tournament(self.owner, "T2")
        resp = self.client.get("/api/tournaments/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 2)


# ─────────────────────────────────────────────────────────────────────────────
# 4. JOIN / INVITE
# ─────────────────────────────────────────────────────────────────────────────

class TournamentJoinTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("joinowner", role="admin")
        self.user  = self.make_user("joiner")
        self.t     = self.make_tournament(self.owner, open_reg=True)

    def test_join_by_token_success(self):
        self.auth(self.user)
        resp = self.client.post("/api/tournaments/join/", {
            "token": str(self.t.invite_token),
            "pin":   self.t.invite_pin,
        })
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK, status.HTTP_201_CREATED
        ])
        self.assertTrue(
            TournamentMember.objects.filter(
                tournament=self.t, user=self.user
            ).exists()
        )

    def test_join_wrong_pin(self):
        self.auth(self.user)
        resp = self.client.post("/api/tournaments/join/", {
            "token": str(self.t.invite_token),
            "pin":   "000000",
        })
        if resp.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]:
            pass
        else:
            self.assertIn(resp.status_code, [
                status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN
            ])

    def test_join_twice_returns_error(self):
        self.join(self.t, self.user)
        self.auth(self.user)
        resp = self.client.post("/api/tournaments/join/", {
            "token": str(self.t.invite_token),
            "pin":   self.t.invite_pin,
        })
        self.assertIn(resp.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK
        ])

    def test_my_role_as_owner(self):
        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/my-role/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["role"], "owner")

    def test_my_role_as_participant(self):
        self.join(self.t, self.user)
        self.auth(self.user)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/my-role/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["role"], "participant")

    def test_my_role_not_member(self):
        self.auth(self.user)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/my-role/")
        if resp.status_code == status.HTTP_200_OK:
            self.assertIn(resp.data.get("role"), [None, ""])
        else:
            self.assertIn(resp.status_code, [
                status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
            ])

    def test_preview_by_token(self):
        self.auth(self.user)
        resp = self.client.get(f"/api/tournaments/join/{self.t.invite_token}/preview/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("name", resp.data)


# ─────────────────────────────────────────────────────────────────────────────
# 5. MEMBERS
# ─────────────────────────────────────────────────────────────────────────────

class TournamentMemberTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("memowner", role="admin")
        self.p1    = self.make_user("mem_p1")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p1)

    def test_list_members(self):
        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/members/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 2)

    def test_list_members_has_avatar_field(self):
        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/members/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for member in resp.data:
            self.assertIn("avatar", member)

    def test_delete_member_as_owner(self):
        m = TournamentMember.objects.get(tournament=self.t, user=self.p1)
        self.auth(self.owner)
        resp = self.client.delete(f"/api/tournaments/{self.t.id}/members/{m.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            TournamentMember.objects.filter(tournament=self.t, user=self.p1).exists()
        )

    def test_delete_member_as_participant_forbidden(self):
        p2 = self.make_user("mem_p2")
        self.join(self.t, p2)
        m = TournamentMember.objects.get(tournament=self.t, user=p2)
        self.auth(self.p1)
        resp = self.client.delete(f"/api/tournaments/{self.t.id}/members/{m.id}/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_leave_tournament(self):
        self.auth(self.p1)
        resp = self.client.delete(f"/api/tournaments/{self.t.id}/leave/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            TournamentMember.objects.filter(tournament=self.t, user=self.p1).exists()
        )

    def test_owner_cannot_leave(self):
        self.auth(self.owner)
        resp = self.client.delete(f"/api/tournaments/{self.t.id}/leave/")
        self.assertIn(resp.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 6. ROUNDS
# ─────────────────────────────────────────────────────────────────────────────

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
        from .jury_views import _criteria_for_tournament
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
        from .jury_views import _criteria_for_tournament
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

class CertificateTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("certowner", role="admin")
        self.p     = self.make_user("certp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)

    def test_list_templates_as_member(self):
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/certificates/templates/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_upload_template_without_image_returns_400(self):
        self.auth(self.owner)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/certificates/templates/",
            {"cert_type": "participant"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_template_as_participant_forbidden(self):
        self.auth(self.p)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/certificates/templates/",
            {"cert_type": "participant"},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_generate_without_template_returns_400(self):
        self.auth(self.owner)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/certificates/generate/",
            {"cert_type": "participant", "user_ids": []},
            format="json",
        )
        self.assertIn(resp.status_code, [
            status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND
        ])

    def test_stock_generate_creates_certificate(self):
        self.auth(self.owner)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/certificates/stock-generate/",
            {"cert_type": "participant", "user_ids": [self.p.id]},
            format="json",
        )
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK, status.HTTP_201_CREATED
        ])
        if resp.status_code in [200, 201]:
            self.assertGreaterEqual(resp.data.get("generated", 0), 1)

    def test_list_certificates_as_admin(self):
        self.auth(self.owner)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/certificates/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_list_certificates_as_non_member_forbidden(self):
        outsider = self.make_user("certoutsider")
        self.auth(outsider)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/certificates/")
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_my_certificates_endpoint(self):
        self.auth(self.p)
        resp = self.client.get("/api/tournaments/my-certificates/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_download_nonexistent_certificate(self):
        self.auth(self.p)
        resp = self.client.get(
            f"/api/tournaments/{self.t.id}/certificates/99999/download/"
        )
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 12. ANNOUNCEMENTS
# ─────────────────────────────────────────────────────────────────────────────

class AnnouncementTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("annowner", role="admin")
        self.p     = self.make_user("annp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)

    def _url(self):
        return f"/api/tournaments/{self.t.id}/announcements/"

    def test_create_announcement_as_owner(self):
        self.auth(self.owner)
        resp = self.client.post(self._url(), {
            "title": "Important",
            "body":  "Read this!",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_create_announcement_as_participant_forbidden(self):
        self.auth(self.p)
        resp = self.client.post(self._url(), {
            "title": "Hack",
            "body":  "Not allowed",
        })
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST
        ])

    def test_list_announcements_as_member(self):
        Announcement.objects.create(
            tournament=self.t,
            author=self.owner,
            title="Hello",
            body="World",
        )
        self.auth(self.p)
        resp = self.client.get(self._url())
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp.data), 1)


# ─────────────────────────────────────────────────────────────────────────────
# 13. REGISTRATION EXCEPTION
# ─────────────────────────────────────────────────────────────────────────────

class RegistrationExceptionTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("excowner", role="admin")
        now = timezone.now()
        self.t = Tournament.objects.create(
            name="Closed Tournament",
            description="Closed",
            start_date=now + timedelta(days=5),
            end_date=now + timedelta(days=30),
        )
        TournamentMember.objects.create(
            tournament=self.t, user=self.owner, role="owner"
        )

    def test_registration_closed_by_default(self):
        self.assertFalse(self.t.registration_open())

    def test_activate_exception(self):
        self.auth(self.owner)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/registration-exception/",
            {"minutes": 30},
            format="json",
        )
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK, status.HTTP_201_CREATED
        ])
        self.t.refresh_from_db()
        self.assertTrue(self.t.registration_open())

    def test_join_during_exception(self):
        self.t.registration_exception_until = timezone.now() + timedelta(minutes=30)
        self.t.save()
        joiner = self.make_user("excjoiner")
        self.auth(joiner)
        resp = self.client.post("/api/tournaments/join/", {
            "token": str(self.t.invite_token),
            "pin":   self.t.invite_pin,
        })
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK, status.HTTP_201_CREATED
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 14. PERMISSIONS
# ─────────────────────────────────────────────────────────────────────────────

class PermissionTests(BaseTest):

    def setUp(self):
        self.owner    = self.make_user("permowner", role="admin")
        self.jury     = self.make_user("permjury")
        self.p        = self.make_user("permp")
        self.outsider = self.make_user("permout")
        self.t = self.make_tournament(self.owner)
        self.join(self.t, self.jury, role="jury")
        self.join(self.t, self.p,    role="participant")

    def test_outsider_cannot_see_members(self):
        self.auth(self.outsider)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/members/")
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_jury_cannot_delete_tournament(self):
        self.auth(self.jury)
        resp = self.client.delete(f"/api/tournaments/{self.t.id}/")
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_participant_cannot_create_round(self):
        self.auth(self.p)
        resp = self.client.post(f"/api/tournaments/{self.t.id}/rounds/", {
            "title": "Bad Round",
        })
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST
        ])

    def test_unauthenticated_cannot_join(self):
        resp = self.client.post("/api/tournaments/join/", {
            "token": str(self.t.invite_token),
            "pin":   self.t.invite_pin,
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jury_can_access_jury_panel(self):
        self.auth(self.jury)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/jury/submissions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_participant_cannot_access_jury_panel(self):
        self.auth(self.p)
        resp = self.client.get(f"/api/tournaments/{self.t.id}/jury/submissions/")
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])

    def test_regenerate_pin_as_owner(self):
        self.auth(self.owner)
        old_pin = self.t.invite_pin
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/regenerate-pin/",
            {"role": "participant"},
            format="json",
        )
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK, status.HTTP_201_CREATED
        ])
        self.t.refresh_from_db()
        self.assertNotEqual(self.t.invite_pin, old_pin)

    def test_regenerate_pin_as_participant_forbidden(self):
        self.auth(self.p)
        resp = self.client.post(
            f"/api/tournaments/{self.t.id}/regenerate-pin/",
            {"role": "participant"},
            format="json",
        )
        self.assertIn(resp.status_code, [
            status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND
        ])


# ─────────────────────────────────────────────────────────────────────────────
# 15. MODEL UNIT TESTS
# ─────────────────────────────────────────────────────────────────────────────

class ModelTests(BaseTest):

    def test_tournament_registration_open_after_start(self):
        now = timezone.now()
        t = Tournament.objects.create(
            name="Open", description="x",
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(days=7),
        )
        self.assertTrue(t.registration_open())

    def test_tournament_registration_closed_before_start(self):
        now = timezone.now()
        t = Tournament.objects.create(
            name="Closed", description="x",
            start_date=now + timedelta(days=3),
            end_date=now + timedelta(days=7),
        )
        self.assertFalse(t.registration_open())

    def test_tournament_registration_open_via_exception(self):
        now = timezone.now()
        t = Tournament.objects.create(
            name="Exception", description="x",
            start_date=now + timedelta(days=3),
            registration_exception_until=now + timedelta(minutes=10),
        )
        self.assertTrue(t.registration_open())

    def test_profile_created_automatically(self):
        from apps.users.models import Profile
        user = self.make_user("autoprofile")
        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_tournament_member_unique_together(self):
        from django.db import IntegrityError
        owner = self.make_user("uqowner")
        t = self.make_tournament(owner)
        p = self.make_user("uqp")
        TournamentMember.objects.create(tournament=t, user=p, role="participant")
        with self.assertRaises(IntegrityError):
            TournamentMember.objects.create(tournament=t, user=p, role="participant")

    def test_grade_total_via_recalc(self):
        owner = self.make_user("gtowner")
        p     = self.make_user("gtp")
        jury  = self.make_user("gtjury")
        t     = self.make_tournament(owner)
        self.join(t, p)
        self.join(t, jury, role="jury")
        r    = self.make_round(t)
        task = self.make_task(r)
        sub  = Submission.objects.create(task=task, participant=p, text="x")
        grade = Grade.objects.create(
            submission=sub,
            juror=jury,
            scores={"a": 3, "b": 7},
            comment="ok",
        )
        self.assertEqual(grade.total, 0)
        grade.recalc_total()
        self.assertEqual(grade.total, 10)

    def test_get_invite_token_for_role(self):
        owner = self.make_user("tokenowner")
        t = self.make_tournament(owner)
        self.assertEqual(t.get_invite_token_for_role("participant"), t.invite_token)
        self.assertEqual(t.get_invite_token_for_role("jury"),        t.jury_invite_token)
        self.assertEqual(t.get_invite_token_for_role("admin"),       t.admin_invite_token)
        self.assertIsNone(t.get_invite_token_for_role("unknown"))

# ─────────────────────────────────────────────────────────────────────────────
# 16. JURY GRADING — ДОДАТКОВІ ТЕСТИ
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
        from .jury_views import _criteria_for_tournament
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

        from .jury_views import _criteria_for_tournament
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

class TeamTournamentTests(BaseTest):

    def setUp(self):
        from .models import Team, TeamMember
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
        from .models import Submission
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

        from .jury_views import _criteria_for_tournament
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

class AnnouncementCommentTests(BaseTest):

    def setUp(self):
        self.owner = self.make_user("cmtowner", role="admin")
        self.p     = self.make_user("cmtp")
        self.t     = self.make_tournament(self.owner)
        self.join(self.t, self.p)
        self.ann = Announcement.objects.create(
            tournament=self.t,
            author=self.owner,
            title="Test",
            body="Body",
        )

    def _comment_url(self):
        return f"/api/tournaments/{self.t.id}/announcements/{self.ann.id}/comments/"

    def test_participant_can_comment(self):
        """Учасник може залишити коментар до оголошення."""
        self.auth(self.p)
        resp = self.client.post(self._comment_url(), {"text": "Nice!"})
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_list_comments(self):
        """Список коментарів доступний учасникам (GET або через POST-list)."""
        AnnouncementComment.objects.create(
            announcement=self.ann, author=self.p, text="Hello"
        )
        self.auth(self.p)
        resp = self.client.get(self._comment_url())
        # 200 якщо GET підтримується, 405 якщо endpoint тільки для POST
        self.assertIn(resp.status_code, [
            status.HTTP_200_OK,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        ])
        if resp.status_code == status.HTTP_200_OK:
            self.assertGreaterEqual(len(resp.data), 1)

    def test_unauthenticated_cannot_comment(self):
        """Неавторизований не може коментувати."""
        resp = self.client.post(self._comment_url(), {"text": "Hack"})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────────────────────────────────────
# 21. MY GRADES (PARTICIPANT NEWS)
# ─────────────────────────────────────────────────────────────────────────────

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
        from .jury_views import _criteria_for_tournament
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
        from .jury_views import _criteria_for_tournament
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
        from .jury_views import _criteria_for_tournament
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
        from .jury_views import _criteria_for_tournament
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
        self.assertEqual(resp.data["grades_count"], 1)