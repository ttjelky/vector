
from django.urls import path
from .views import (
    MyTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    RegisterView,
    VerifyEmailView,
    ResendCodeView,
    profile,
    jury_submissions,
    dashboard_data,
)

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path("login/",         MyTokenObtainPairView.as_view(),  name="token-obtain"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("logout/",        LogoutView.as_view(),             name="logout"),
    path("register/",      RegisterView.as_view(),           name="register"),
    path("register/verify/", VerifyEmailView.as_view(),      name="register-verify"),
    path("register/resend/", ResendCodeView.as_view(),       name="register-resend"),

    # ── Profile & misc ────────────────────────────────────────────────────────
    path("profile/",           profile,          name="profile"),
    path("jury-submissions/",  jury_submissions,  name="jury-submissions"),
    path("dashboard/",         dashboard_data,    name="dashboard"),
]