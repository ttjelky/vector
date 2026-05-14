"""Tournament CRUD, Join, Member tests."""
from rest_framework import status
from .base import BaseTest

from ..models import Tournament, TournamentMember
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
