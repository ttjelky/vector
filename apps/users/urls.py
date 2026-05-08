from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, MyTokenObtainPairView
from .views import dashboard_data
from .views import profile
from . import views

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api_register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', views.profile),
    path('chart/', dashboard_data),
]
