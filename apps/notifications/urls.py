from django.urls import path
from . import views

urlpatterns = [
    path('',                      views.notification_list, name='notification_list'),
    path('send/',                 views.send_notification,  name='notification_send'),
    path('mark-read/',            views.mark_all_read,      name='notification_mark_all_read'),
    path('mark-read/<int:pk>/',   views.mark_one_read,      name='notification_mark_one_read'),
    path('search-users/',         views.search_users,       name='notification_search_users'),
]