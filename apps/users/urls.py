<<<<<<< HEAD
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MyTokenObtainPairView
from .views import dashboard_data
from .views import profile
=======
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, MyTokenObtainPairView
from .views import dashboard_data
from .views import ProfileView
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
from . import views

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api_register'),
    path('login/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
<<<<<<< HEAD
    path('api_create=tournament/', views.create_tournament),
    path('profile/', profile),
    path('chart/', dashboard_data),
]
=======
    path('create-tournament/', views.create_tournament),
    path('profile/', ProfileView.as_view()),
    path('chart/', dashboard_data),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
