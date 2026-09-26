from django.db.models import Q, Count
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from ...models import Tournament, TournamentMember, RegistrationResponse
from ..serializers import TournamentSerializer
from ..serializers.registration import validate_answers


class PublicTournamentListView(generics.ListAPIView):
    """
    GET /tournaments/public/
    Список публічних турнірів для учасників.
    Query: ?search= ?tournament_type=solo|team ?ordering=name|-start_date|...
    """
    serializer_class = TournamentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Tournament.objects.all().order_by('-id')
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        ttype = self.request.query_params.get('tournament_type', '').strip()
        if ttype in ('solo', 'team'):
            qs = qs.filter(tournament_type=ttype)
        is_public = self.request.query_params.get('is_public')
        # За замовчуванням — тільки публічні
        if is_public in ('false', '0'):
            pass  # показати всі? ні — все одно тільки публічні для безпеки
        qs = qs.filter(is_public=True)
        ordering = self.request.query_params.get('ordering', '').strip()
        allowed = {'name', '-name', 'start_date', '-start_date',
                   'end_date', '-end_date', 'id', '-id'}
        if ordering in allowed:
            qs = qs.order_by(ordering)
        return qs


class PublicTournamentJoinView(APIView):
    """
    POST /tournaments/<pk>/join-public/
    Body: { answers?: {field_id: value} }
    Приєднання в 1 клік без токена (тільки якщо is_public).
    Тільки для user.role == participant (як invite role participant).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk):
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        if not tournament.is_public:
            return Response({'detail': 'Турнір не є публічним. Потрібне посилання-запрошення.'},
                            status=403)

        if request.user.role != 'participant':
            return Response({
                'detail': (
                    f'Публічне приєднання доступне для учасників. '
                    f'Ваша роль у системі — «{request.user.role}».'
                ),
                'role_mismatch': True,
                'required_role': 'participant',
                'user_role': request.user.role,
            }, status=403)

        already = TournamentMember.objects.filter(tournament=tournament, user=request.user).exists()
        if not already:
            is_open, reason, message = tournament.registration_status()
            if not is_open:
                return Response(
                    {
                        'detail': message or 'Реєстрація учасників зараз закрита.',
                        'reason': reason,
                        'registration_open': False,
                    },
                    status=403,
                )

        answers = request.data.get('answers', {}) or {}
        try:
            norm = validate_answers(tournament, answers)
        except Exception as exc:
            detail = getattr(exc, 'detail', str(exc))
            return Response({'detail': detail, 'errors': detail}, status=400)

        member, created = TournamentMember.objects.get_or_create(
            tournament=tournament, user=request.user,
            defaults={'role': 'participant'},
        )
        if norm or not created:
            RegistrationResponse.objects.update_or_create(
                tournament=tournament, user=request.user,
                defaults={'answers': norm},
            )

        return Response({
            'tournament_id': tournament.id,
            'tournament_name': tournament.name,
            'role': member.role,
            'already_member': not created,
        })
