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

    if request.method == 'GET':
        return Response({
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": user.profile.avatar.url if hasattr(user, "profile") and user.profile.avatar else None
        })

    if request.method == 'PUT':
        user.first_name = request.data.get("first_name", user.first_name)
        user.last_name = request.data.get("last_name", user.last_name)
        user.email = request.data.get("email", user.email)
        user.save()

        profile = user.profile
        if "avatar" in request.FILES:
            profile.avatar = request.FILES["avatar"]
            profile.save()

        return Response({
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar": profile.avatar.url if profile.avatar else None
        })


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