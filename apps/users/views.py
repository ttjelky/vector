from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.conf import settings
from django.http import JsonResponse

from .serializers import RegisterSerializer, MyTokenObtainPairSerializer
from .models import Profile

User = get_user_model()


# ── Cookie helpers ────────────────────────────────────────────────────────────

def _set_refresh_cookie(response, refresh_token: str):
    response.set_cookie(
        key      = settings.AUTH_COOKIE,
        value    = refresh_token,
        max_age  = settings.AUTH_COOKIE_MAX_AGE,
        secure   = settings.AUTH_COOKIE_SECURE,
        httponly = settings.AUTH_COOKIE_HTTP_ONLY,
        path     = settings.AUTH_COOKIE_PATH,
        samesite = settings.AUTH_COOKIE_SAMESITE,
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(
        settings.AUTH_COOKIE,
        path     = settings.AUTH_COOKIE_PATH,
        samesite = settings.AUTH_COOKIE_SAMESITE,
    )


def _user_payload(user):
    """Повертає dict з даними юзера що потрібні фронтенду."""
    role = getattr(user, "role", None)
    if not role:
        role = "admin" if (user.is_superuser or user.is_staff) else "participant"
    return {
        "first_name": user.first_name,
        "last_name":  user.last_name,
        "role":       role,
    }


# ── Login ─────────────────────────────────────────────────────────────────────

class MyTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/users/login/
    Повертає: { access, first_name, last_name, role }
    Refresh token — httpOnly cookie.
    """
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop("refresh", None)
            if refresh_token:
                _set_refresh_cookie(response, refresh_token)
        return response


# ── Token Refresh ─────────────────────────────────────────────────────────────

class CookieTokenRefreshView(APIView):
    """
    POST /api/users/token/refresh/
    Читає refresh cookie → повертає новий access + дані юзера.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.AUTH_COOKIE)

        if not refresh_token:
            return Response(
                {"detail": "Refresh token відсутній. Будь ласка, увійдіть знову."},
                status=401,
            )

        try:
            token  = RefreshToken(refresh_token)
            access = str(token.access_token)

            user_id = token.payload.get("user_id")
            try:
                user      = User.objects.get(pk=user_id)
                user_data = _user_payload(user)
            except User.DoesNotExist:
                user_data = {}

            response = Response({"access": access, **user_data})

            if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS"):
                _set_refresh_cookie(response, str(token))

            return response

        except TokenError:
            return Response(
                {"detail": "Сесія завершена. Будь ласка, увійдіть знову."},
                status=401,
            )


# ── Logout ────────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    """
    POST /api/users/logout/
    Інвалідує refresh token і видаляє cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.AUTH_COOKIE)
        response = Response({"detail": "Вийшли успішно."})

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        _clear_refresh_cookie(response)
        return response


# ── Register ──────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /api/users/register/
    Реєструє юзера і одразу повертає access + cookie.
    """
    queryset           = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class   = RegisterSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)

        if response.status_code == 201:
            try:
                user    = User.objects.get(email=request.data.get("email"))
                refresh = RefreshToken.for_user(user)

                response.data["access"] = str(refresh.access_token)
                response.data.update(_user_payload(user))

                _set_refresh_cookie(response, str(refresh))
            except Exception:
                pass

        return response


# ── Profile ───────────────────────────────────────────────────────────────────

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    prof, _ = Profile.objects.get_or_create(user=user)

    if request.method == "GET":
        return Response({
            "email":      user.email,
            "first_name": user.first_name,
            "last_name":  user.last_name,
            "avatar":     prof.avatar.url if prof.avatar else None,
        })

    user.first_name = request.data.get("first_name", user.first_name)
    user.last_name  = request.data.get("last_name",  user.last_name)
    user.email      = request.data.get("email",      user.email)
    user.save()

    if "avatar" in request.FILES:
        prof.avatar = request.FILES["avatar"]
        prof.save()

    return Response({
        "email":      user.email,
        "first_name": user.first_name,
        "last_name":  user.last_name,
        "avatar":     prof.avatar.url if prof.avatar else None,
    })


# ── Misc ──────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def jury_submissions(request):
    from apps.tournaments.models import Grade

    grades = (
        Grade.objects
        .filter(juror=request.user)
        .select_related("submission__task__round__tournament", "submission__participant")
        .order_by("-updated_at")
    )

    result = []
    for grade in grades:
        sub = grade.submission
        rnd = sub.task.round
        result.append({
            "id":              sub.id,
            "task_title":      sub.task.title,
            "round_title":     rnd.title,
            "round_id":        rnd.id,
            "tournament_name": rnd.tournament.name,
            "submitted_at":    sub.submitted_at.isoformat(),
            "my_grade": {
                "total":      grade.total,
                "scores":     grade.scores,
                "comment":    grade.comment,
                "updated_at": grade.updated_at.isoformat(),
            },
        })

    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])  # виправлено: було публічним endpoint
def dashboard_data(request):
    return JsonResponse({
        "total_users":  User.objects.count(),
        "active_users": User.objects.filter(is_active=True).count(),
        "new_users":    User.objects.filter(date_joined__gte="2026-03-01").count(),
    })
