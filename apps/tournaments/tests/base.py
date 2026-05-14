"""Base test class with helpers."""
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import (
    Tournament, TournamentMember, Round, Task, Submission,
    Grade, JuryAssignment, Certificate, CertificateTemplate,
    Announcement, AnnouncementComment,
)
User = get_user_model()

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
