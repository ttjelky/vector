import json

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import Notification, NotificationAttachment, NotificationLink

from django.contrib.auth import get_user_model
User = get_user_model()


# ── Пошук юзерів (для автодоповнення в ComposeModal) ─────────────────────────
# GET /api/notifications/search-users/?q=іван
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    q = request.GET.get('q', '').strip()
    if len(q) < 2:
        return Response([])

    users = User.objects.filter(
        Q(username__icontains=q) |
        Q(email__icontains=q) |
        Q(first_name__icontains=q) |
        Q(last_name__icontains=q)
    ).exclude(id=request.user.id)[:10]

    return Response([
        {
            'username':   u.username,
            'email':      u.email,
            'full_name':  f"{u.first_name} {u.last_name}".strip() or u.username,
            'role':       u.role,
        }
        for u in users
    ])


# ── Список сповіщень ──────────────────────────────────────────────────────────
# GET /api/notifications/
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    notifs = Notification.objects.filter(recipient=request.user).select_related('sender')
    data = []
    for n in notifs:
        data.append({
            'id':          n.id,
            'text':        n.text,
            'subject':     n.subject,
            'tournament':  n.tournament,
            'is_read':     n.is_read,
            'created_at':  n.created_at.strftime('%d.%m.%Y %H:%M'),
            'sender':      n.sender.username if n.sender else None,
            'sender_full': f"{n.sender.first_name} {n.sender.last_name}".strip() if n.sender else None,
            'links':       [{'url': l.url, 'label': l.label} for l in n.links.all()],
            'attachments': [{'name': a.name, 'url': a.file.url} for a in n.attachments.all()],
        })
    return Response(data)


# ── Позначити всі прочитаними ─────────────────────────────────────────────────
# POST /api/notifications/mark-read/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


# ── Позначити одне прочитаним ─────────────────────────────────────────────────
# POST /api/notifications/mark-read/<pk>/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_one_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk, recipient=request.user)
        n.is_read = True
        n.save()
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response({'error': 'not found'}, status=404)


# ── Відправити сповіщення ─────────────────────────────────────────────────────
# POST /api/notifications/send/
# Поля форми:
#   to_query   — username / email / ім'я — шукаємо по всіх полях
#   subject    — тема (необов'язково)
#   text       — текст (обов'язково)
#   tournament — назва турніру (необов'язково)
#   links      — JSON: [{"url":"...","label":"..."}]
#   files      — файли (multipart)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def send_notification(request):
    to_query   = request.data.get('to_query', '').strip()
    subject    = request.data.get('subject', '').strip()
    text       = request.data.get('text', '').strip()
    tournament = request.data.get('tournament', '').strip()
    links_raw  = request.data.get('links', '[]')

    if not to_query:
        return Response({'error': 'Вкажіть отримувача'}, status=400)
    if not text:
        return Response({'error': 'Текст повідомлення обов\'язковий'}, status=400)

    # Шукаємо отримувача по username / email / імені / прізвищу
    recipient = User.objects.filter(
        Q(username__iexact=to_query) |
        Q(email__iexact=to_query) |
        Q(first_name__icontains=to_query) |
        Q(last_name__icontains=to_query)
    ).exclude(id=request.user.id).first()

    if not recipient:
        return Response(
            {'error': f'Користувача "{to_query}" не знайдено. Спробуйте username або email.'},
            status=404
        )

    notif = Notification.objects.create(
        recipient  = recipient,
        sender     = request.user,
        text       = text,
        subject    = subject,
        tournament = tournament,
    )

    # Посилання
    try:
        links = json.loads(links_raw) if isinstance(links_raw, str) else links_raw
        for l in links:
            if l.get('url'):
                NotificationLink.objects.create(
                    notification=notif,
                    url=l['url'],
                    label=l.get('label', ''),
                )
    except Exception:
        pass

    # Файли
    for f in request.FILES.getlist('files'):
        NotificationAttachment.objects.create(
            notification=notif,
            file=f,
            name=f.name,
        )

    return Response({
        'status': 'sent',
        'id': notif.id,
        'recipient': recipient.username,
        'recipient_full': f"{recipient.first_name} {recipient.last_name}".strip() or recipient.username,
    }, status=201)