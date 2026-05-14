"""Model unit tests."""
from rest_framework import status
from .base import BaseTest
from django.utils import timezone
from apps.tournaments.models import Submission, TournamentMember, Tournament, Grade
from datetime import timedelta

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
