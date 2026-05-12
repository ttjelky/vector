
from django.urls import path
from .views import (
    MyTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    RegisterView,
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

    # ── Profile & misc ────────────────────────────────────────────────────────
    path("profile/",           profile,          name="profile"),
    path("jury-submissions/",  jury_submissions,  name="jury-submissions"),
    path("dashboard/",         dashboard_data,    name="dashboard"),
]