"""Permission and Registration exception tests."""
from rest_framework import status
from .base import BaseTest
from django.utils import timezone
from apps.tournaments.models import Submission, TournamentMember, Tournament, Grade
from datetime import timedelta

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
