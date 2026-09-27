"""Public profile tests."""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class PublicProfileTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="u1@test.com", email="u1@test.com",
            password="pass1234!", role="participant",
        )
        self.other = User.objects.create_user(
            username="u2@test.com", email="u2@test.com", password="pass1234!",
            role="jury", first_name="Anna", last_name="Bee",
        )

    def auth(self, user):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
        )

    def test_public_profile_ok(self):
        self.auth(self.user)
        r = self.client.get(f"/api/users/{self.other.id}/profile/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["id"], self.other.id)
        self.assertEqual(r.data["full_name"], "Anna Bee")
        self.assertEqual(r.data["first_name"], "Anna")
        self.assertEqual(r.data["last_name"], "Bee")
        self.assertEqual(r.data["role"], "jury")
        self.assertIn("email", r.data)
        self.assertIn("bio", r.data)
        self.assertIn("phone", r.data)
        self.assertIn("banner", r.data)

    def test_public_profile_404(self):
        self.auth(self.user)
        r = self.client.get("/api/users/999999/profile/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_profile_requires_auth(self):
        r = self.client.get(f"/api/users/{self.other.id}/profile/")
        self.assertIn(r.status_code, [status.HTTP_401_UNAUTHORIZED,
                                      status.HTTP_403_FORBIDDEN])
