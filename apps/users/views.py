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


def _avatar_url(request, prof):
    """Повертає абсолютний URL аватарки (або None)."""
    try:
        if prof.avatar and hasattr(prof.avatar, "url"):
            return request.build_absolute_uri(prof.avatar.url)
    except Exception:
        pass
    return None


def _banner_url(request, prof):
    """Повертає абсолютний URL банера (або None)."""
    try:
        if prof.banner and hasattr(prof.banner, "url"):
            return request.build_absolute_uri(prof.banner.url)
    except Exception:
        pass
    return None


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

def _send_verification_email(email: str, code: str):
    """Надсилає 6-значний код. Не кидає виняток назовні — логує помилку."""
    from .email_utils import send_transactional_email

    subject = "Vector — код підтвердження пошти"
    message = (
        f"Ваш код підтвердження Vector: {code}\n\n"
        f"Код дійсний 15 хвилин. Нікому його не повідомляйте."
    )
    try:
        ok = send_transactional_email(email, subject, message)
        if not ok:
            print(f"[EmailVerification] не вдалось надіслати лист на {email} | код: {code}")
        return ok
    except Exception as exc:
        print(f"[EmailVerification] не вдалось надіслати лист на {email}: {exc} | код: {code}")
        return False


class RegisterView(generics.CreateAPIView):
    """
    POST /api/users/register/
    Створює НЕактивного юзера і надсилає 6-значний код на пошту.
    Відповідь 201: { detail, email } — далі виклич verify.
    Якщо юзер вже існує але неактивний — оновлюємо дані і шлемо новий код.
    """
    queryset           = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class   = RegisterSerializer

    def create(self, request, *args, **kwargs):
        from .models import EmailVerificationCode
        from django.utils import timezone
        from datetime import timedelta

        serializer = self.get_serializer(data=request.data)
        email_raw = (request.data.get("email") or "").strip().lower()

        # Повторна реєстрація неактивного акаунта — ресенд коду з оновленням даних
        existing = User.objects.filter(email__iexact=email_raw).first() if email_raw else None
        if existing is not None and not existing.is_active:
            # Оновлюємо поля з запиту
            existing.first_name = request.data.get("first_name", existing.first_name)
            existing.last_name = request.data.get("last_name", existing.last_name)
            role = request.data.get("role", existing.role or "participant")
            if role in ("admin", "participant", "jury"):
                existing.role = role
            pwd = request.data.get("password")
            if pwd:
                existing.set_password(pwd)
            existing.username = existing.email
            existing.save()

            code_obj = EmailVerificationCode.generate(email=existing.email, user=existing)
            sent = _send_verification_email(existing.email, code_obj.code)

            data = {"detail": "Код підтвердження надіслано на пошту.", "email": existing.email}
            if settings.DEBUG:
                data["debug_code"] = code_obj.code
                data["email_sent"] = sent
            return Response(data, status=201)

        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Деактивуємо до підтвердження
        user.is_active = False
        user.save(update_fields=["is_active"])

        code_obj = EmailVerificationCode.generate(email=user.email, user=user)
        sent = _send_verification_email(user.email, code_obj.code)

        data = {"detail": "Код підтвердження надіслано на пошту.", "email": user.email}
        if settings.DEBUG:
            data["debug_code"] = code_obj.code
            data["email_sent"] = sent
        return Response(data, status=201)


class VerifyEmailView(APIView):
    """
    POST /api/users/register/verify/
    Body: { email, code }
    Активує юзера і повертає access + cookie (як при реєстрації раніше).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import EmailVerificationCode
        email = (request.data.get("email") or "").strip().lower()
        code = (request.data.get("code") or "").strip()
        if not email or not code:
            return Response({"detail": "Вкажіть email і код."}, status=400)

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Користувача не знайдено."}, status=404)

        if user.is_active:
            return Response({"detail": "Пошта вже підтверджена. Увійдіть."}, status=400)

        code_obj = (
            EmailVerificationCode.objects
            .filter(email__iexact=email, is_used=False)
            .order_by("-created_at")
            .first()
        )
        if not code_obj:
            return Response({"detail": "Код не знайдено. Запросіть новий."}, status=400)

        if code_obj.is_expired:
            return Response({"detail": "Код прострочено. Запросіть новий.", "code": "expired"}, status=400)

        if code_obj.attempts >= 5:
            return Response({"detail": "Забагато спроб. Запросіть новий код."}, status=400)

        if code_obj.code != code:
            code_obj.attempts += 1
            code_obj.save(update_fields=["attempts"])
            left = max(0, 5 - code_obj.attempts)
            return Response(
                {"detail": f"Невірний код. Залишилось спроб: {left}."},
                status=400,
            )

        code_obj.is_used = True
        code_obj.save(update_fields=["is_used"])

        user.is_active = True
        user.save(update_fields=["is_active"])

        refresh = RefreshToken.for_user(user)
        response = Response({
            "access": str(refresh.access_token),
            **_user_payload(user),
            "email": user.email,
        })
        _set_refresh_cookie(response, str(refresh))
        return response


class ResendCodeView(APIView):
    """
    POST /api/users/register/resend/
    Body: { email } — новий код (тротлінг 60 сек).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import EmailVerificationCode
        from django.utils import timezone
        from datetime import timedelta
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Вкажіть email."}, status=400)
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Користувача не знайдено."}, status=404)
        if user.is_active:
            return Response({"detail": "Пошта вже підтверджена. Увійдіть."}, status=400)

        last = (
            EmailVerificationCode.objects
            .filter(email__iexact=email)
            .order_by("-created_at")
            .first()
        )
        if last and (timezone.now() - last.created_at) < timedelta(seconds=60):
            wait = 60 - int((timezone.now() - last.created_at).total_seconds())
            return Response(
                {"detail": f"Зачекайте {wait} сек перед повторною відправкою."},
                status=429,
            )

        code_obj = EmailVerificationCode.generate(email=user.email, user=user)
        sent = _send_verification_email(user.email, code_obj.code)
        data = {"detail": "Новий код надіслано на пошту.", "email": user.email}
        if settings.DEBUG:
            data["debug_code"] = code_obj.code
            data["email_sent"] = sent
        return Response(data)


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
            "avatar":     _avatar_url(request, prof),
            "banner":     _banner_url(request, prof),
            "bio":        prof.bio,
            "phone":      prof.phone,
        })

    user.first_name = request.data.get("first_name", user.first_name)
    user.last_name  = request.data.get("last_name",  user.last_name)
    user.email      = request.data.get("email",      user.email)
    user.save()

    prof.bio = request.data.get("bio", prof.bio)
    prof.phone = request.data.get("phone", prof.phone)

    if "avatar" in request.FILES:
        prof.avatar = request.FILES["avatar"]
    if "banner" in request.FILES:
        prof.banner = request.FILES["banner"]
    prof.save()

    return Response({
        "email":      user.email,
        "first_name": user.first_name,
        "last_name":  user.last_name,
        "avatar":     _avatar_url(request, prof),
        "banner":     _banner_url(request, prof),
        "bio":        prof.bio,
        "phone":      prof.phone,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def public_profile(request, user_id):
    """Публічний профіль користувача: ім'я, аватар, роль. Без контактів."""
    try:
        user = User.objects.get(pk=user_id)
    except (User.DoesNotExist, ValueError):
        from rest_framework import status as http_status
        return Response({"detail": "Користувача не знайдено."},
                        status=http_status.HTTP_404_NOT_FOUND)
    prof, _ = Profile.objects.get_or_create(user=user)
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return Response({
        "id":         user.id,
        "username":   user.username,
        "full_name":  full_name or user.username,
        "first_name": user.first_name or "",
        "last_name":  user.last_name or "",
        "email":      user.email,
        "avatar":     _avatar_url(request, prof),
        "banner":     _banner_url(request, prof),
        "bio":        prof.bio or "",
        "phone":      prof.phone or "",
        "role":       getattr(user, "role", None),
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
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    return JsonResponse({
        "total_users":  User.objects.count(),
        "active_users": User.objects.filter(is_active=True).count(),
        "new_users":    User.objects.filter(date_joined__gte="2026-03-01").count(),
    })
