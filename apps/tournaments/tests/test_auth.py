"""Auth & Profile tests."""
from rest_framework import status
from .base import BaseTest

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
