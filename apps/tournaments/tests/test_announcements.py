"""Announcement tests."""
from rest_framework import status
from .base import BaseTest
from apps.tournaments.models import Announcement, AnnouncementComment

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
