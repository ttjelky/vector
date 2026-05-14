"""Certificate tests."""
from rest_framework import status
from .base import BaseTest

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
