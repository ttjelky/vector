from django.contrib import admin
from django.http import HttpResponse, Http404, JsonResponse
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views import View
from django.views.static import serve as media_serve


def health_check(request):
    """Liveness для PaaS / Docker HEALTHCHECK. Без звернень до БД."""
    return JsonResponse({'status': 'ok'})


class FrontendAppView(View):
    """Віддає зібраний React SPA (frontend/dist/index.html) на всіх
    не-API маршрутах. Працює лише коли фронт зібрано (є dist)."""

    def get(self, request, *args, **kwargs):
        index = settings.FRONTEND_DIST_DIR / 'index.html'
        if index.exists():
            # Байти одразу (а не FileResponse): без warning'ів у ASGI-режимі.
            return HttpResponse(index.read_bytes(), content_type='text/html')
        raise Http404('Frontend is not built. Run `npm run build` in /frontend.')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
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

# SPA fallback — останнім: все, що не api/admin/media/static → React.
# Django admin, API та DRF browsable API лишаються доступними.
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/|static/).*$', FrontendAppView.as_view(), name='frontend'),
]