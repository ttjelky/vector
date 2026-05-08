from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.http import JsonResponse

from .serializers import RegisterSerializer, MyTokenObtainPairSerializer
from .models import Profile, IsAdmin

User = get_user_model()


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    # Якщо профіль не існує — створюємо автоматично
    profile, _ = Profile.objects.get_or_create(user=user)

    if request.method == 'GET':
        return Response({
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": profile.avatar.url if profile.avatar else None
        })

    if request.method == 'PUT':
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        user.email = request.data.get("email", user.email)
        user.save()

        if "avatar" in request.FILES:
            profile.avatar = request.FILES["avatar"]
            profile.save()

        return Response({
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": profile.avatar.url if profile.avatar else None
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def jury_submissions(request):
    from tournaments.models import Grade

    grades = (
        Grade.objects
        .filter(juror=request.user)
        .select_related(
            "submission__task__round__tournament",
            "submission__participant",
        )
        .order_by("-updated_at")
    )

    result = []
    for grade in grades:
        sub  = grade.submission
        task = sub.task
        rnd  = task.round

        result.append({
            "id":              sub.id,
            "task_title":      task.title,
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


def dashboard_data(request):
    data = {
        "total_users": User.objects.count(),
        "active_users": User.objects.filter(is_active=True).count(),
        "new_users": User.objects.filter(date_joined__gte='2026-03-01').count()
    }
    return JsonResponse(data)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer