<<<<<<< HEAD
from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .serializers import RegisterSerializer
from .models import User
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
import json
from .models import Profile
from .models import IsAdmin
from .models import Tournament
from rest_framework.decorators import api_view, permission_classes

User = get_user_model()

@csrf_exempt
def profile(request):
    user = request.user

    if not user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    profile = Profile.objects.get(user=user)

    if request.method == "GET":
        return JsonResponse({
            "username": user.username,
            "email": user.email,
            "avatar": user.avatar.url if profile.avatar else None,
        })
    
    if request.method == "POST":
        user.username = request.POST.get("username", user.username)
        user.email = request.POST.get("email", user.email)

        if 'avatar' in request.FILES:
            profile.avatar = request.FILES['avatar']

        user.save()
        profile.save()

        return JsonResponse({"status": "updated"})


@api_view(['GET'])
def profile(request):
    user = request.user

    return Response({
        "username": user.username,
        "email": user.email,
    })

=======
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import ProfileSerializer
from .serializers import RegisterSerializer
from .serializers import MyTokenObtainPairSerializer
from .models import IsAdmin
from .models import Tournament
from .models import Profile

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
def dashboard_data(request):
    data = {
        "total_users": User.objects.count(),
        "active_users": User.objects.filter(is_active=True).count(),
        "new_users": User.objects.filter(date_joined__gte='2026-03-01').count()
    }
    return JsonResponse(data)

<<<<<<< HEAD
@api_view(['POST'])
=======
@api_view (['POST'])
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
@permission_classes([IsAdmin])
def create_tournament(request):
    data = request.data

    tournament = Tournament.objects.create(
        name=data.get('name'),
        description=data.get('description'),
        start_date=data.get('start_date'),
        registration_start=data.get('registration_start'),
        registration_end=data.get('registration_end'),
        max_teams=data.get('max_teams'),
        format=data.get('format'),
        created_by=request.user
    )

    return Response({"message": "Tournament created"})

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
<<<<<<< HEAD
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
=======
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        print("DATA:", request.data)
        print("FILES:", request.FILES)
        profile, _ = Profile.objects.get_or_create(user=request.user)

        serializer = ProfileSerializer(
            profile,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
