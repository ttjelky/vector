from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve as media_serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('api/password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    path('api/tournaments/', include('apps.tournaments.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Медіафайли (аватарки, кастомні зображення турнірів) мають
    # роздаватись і при DEBUG=False (локальний запуск, SQLite).
    # static() у Django — no-op при DEBUG=False, тому додаємо маршрут напряму.
    # У production за наявності nginx цей маршрут перекриється веб-сервером.
    urlpatterns += [
        re_path(
            r'^media/(?P<path>.*)$',
            media_serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]