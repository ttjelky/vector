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


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user

    if request.method == "GET":
        try:
            profile_obj = Profile.objects.get(user=user)
            avatar_url = profile_obj.avatar.url if profile_obj.avatar else None
        except Profile.DoesNotExist:
            avatar_url = None

        return Response({
            "username": user.username,
            "email": user.email,
            "avatar": avatar_url,
        })

    if request.method == "POST":
        user.username = request.POST.get("username", user.username)
        user.email = request.POST.get("email", user.email)
        user.save()

        try:
            profile_obj = Profile.objects.get(user=user)
            if 'avatar' in request.FILES:
                profile_obj.avatar = request.FILES['avatar']
            profile_obj.save()
        except Profile.DoesNotExist:
            pass

        return Response({"status": "updated"})


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