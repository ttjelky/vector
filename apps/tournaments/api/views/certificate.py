import io
import os
from datetime import date

from django.core.files.base import ContentFile
from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from reportlab.lib.utils import ImageReader

from ...models import (
    Tournament, TournamentMember,
    CertificateTemplate, Certificate,
    CERT_TYPE_CHOICES,
    Team, TeamMember,
)

CERT_TYPE_DISPLAY = dict(CERT_TYPE_CHOICES)

STOCK_TEMPLATES = {
    "classic": {"label": "Класичний",   "description": "Мінімалістичний чорно-білий стиль з подвійною рамкою"},
    "elegant": {"label": "Елегантний",  "description": "Темний фон з золотистими акцентами"},
    "modern":  {"label": "Сучасний",    "description": "Геометричний дизайн у сірих тонах"},
}


def _get_role(user, tournament_pk):
    m = TournamentMember.objects.filter(tournament_id=tournament_pk, user=user).first()
    return m.role if m else None


def _is_admin(user, tournament_pk):
    return _get_role(user, tournament_pk) in ('owner', 'admin')


# ── PDF generators ────────────────────────────────────────────────────────────

def _get_font(size, bold=False):
    from PIL import ImageFont
    bold_candidates = [
        "C:/Windows/Fonts/georgiab.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    regular_candidates = [
        "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for path in (bold_candidates if bold else regular_candidates):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def _draw_centered(draw, text, y, font, fill, W):
    from PIL import ImageDraw
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, y), text, font=font, fill=fill)


def _img_to_pdf(img) -> bytes:
    from reportlab.pdfgen import canvas
    W, H = img.size
    img_buf = io.BytesIO()
    img.convert("RGB").save(img_buf, format="JPEG", quality=95)
    img_buf.seek(0)
    pdf_buf = io.BytesIO()
    pw, ph = W * 0.75, H * 0.75
    c = canvas.Canvas(pdf_buf, pagesize=(pw, ph))
    c.drawImage(ImageReader(img_buf), 0, 0, width=pw, height=ph)
    c.save()
    return pdf_buf.getvalue()


def _render_stock(stock_key: str, W: int, H: int,
                  title_line: str, subtitle_line: str,
                  body_line: str, body2_line: str,
                  extra_lines: list, cert_type_label: str):
    """
    Спільний рендер стокового сертифіката.
    title_line   — великий текст (ім'я або назва команди)
    subtitle_line — рядок під title (напр. «склад:» або тип серт.)
    body_line    — рядок турніру
    body2_line   — ще один рядок (опціонально)
    extra_lines  — список рядків для дрібного тексту (склад команди)
    """
    from PIL import Image, ImageDraw

    if stock_key == "classic":
        img = Image.new("RGB", (W, H), "#ffffff")
        draw = ImageDraw.Draw(img)
        m, i = 60, 84
        draw.rectangle([m, m, W-m, H-m], outline="#111", width=6)
        draw.rectangle([i, i, W-i, H-i], outline="#111", width=2)

        y = i + 60
        _draw_centered(draw, "СЕРТИФІКАТ", y, _get_font(110, bold=True), "#111", W); y += 140
        _draw_centered(draw, cert_type_label, y, _get_font(48), "#555", W); y += 70
        draw.line([(i+60, y), (W-i-60, y)], fill="#ccc", width=1); y += 30
        _draw_centered(draw, title_line, y, _get_font(88, bold=True), "#111", W); y += 110
        if subtitle_line:
            _draw_centered(draw, subtitle_line, y, _get_font(44), "#333", W); y += 60
        for line in extra_lines:
            _draw_centered(draw, line, y, _get_font(36), "#555", W); y += 46
        if extra_lines:
            y += 10
        draw.line([(i+60, y), (W-i-60, y)], fill="#ccc", width=1); y += 30
        _draw_centered(draw, body_line, y, _get_font(48), "#333", W); y += 65
        if body2_line:
            _draw_centered(draw, body2_line, y, _get_font(38), "#555", W)
        _draw_centered(draw, date.today().strftime("%d.%m.%Y"), H-i-80, _get_font(40), "#999", W)

    elif stock_key == "elegant":
        img = Image.new("RGB", (W, H), "#1a1a2e")
        draw = ImageDraw.Draw(img)
        gold, m = "#c9a84c", 70
        draw.rectangle([m, m, W-m, H-m], outline=gold, width=5)
        draw.rectangle([m+20, m+20, W-m-20, H-m-20], outline=gold, width=1)
        cs = 80
        for cx, cy in [(m,m),(W-m,m),(m,H-m),(W-m,H-m)]:
            draw.line([(cx,cy-cs),(cx,cy+cs)], fill=gold, width=3)
            draw.line([(cx-cs,cy),(cx+cs,cy)], fill=gold, width=3)

        y = m + 80
        _draw_centered(draw, "СЕРТИФІКАТ", y, _get_font(120, bold=True), gold, W); y += 150
        _draw_centered(draw, cert_type_label, y, _get_font(50), "#e0c97f", W); y += 70
        draw.line([(W//4, y), (W-W//4, y)], fill=gold, width=1); y += 30
        _draw_centered(draw, title_line, y, _get_font(90, bold=True), "#fff", W); y += 115
        if subtitle_line:
            _draw_centered(draw, subtitle_line, y, _get_font(44), "#e0c97f", W); y += 58
        for line in extra_lines:
            _draw_centered(draw, line, y, _get_font(34), "#ccc", W); y += 44
        if extra_lines:
            y += 10
        _draw_centered(draw, body_line, y, _get_font(48), gold, W); y += 65
        if body2_line:
            _draw_centered(draw, body2_line, y, _get_font(36), "#aaa", W)
        _draw_centered(draw, date.today().strftime("%d.%m.%Y"), H-m-100, _get_font(40), "#888", W)

    else:  # modern
        img = Image.new("RGB", (W, H), "#f5f5f5")
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, 24, H], fill="#222")
        draw.rectangle([36, 0, 48, H], fill="#aaa")
        draw.rectangle([80, 60, W-80, 250], fill="#222")
        _draw_centered(draw, "СЕРТИФІКАТ", 80, _get_font(120, bold=True), "#fff", W)
        y = 275
        _draw_centered(draw, cert_type_label, y, _get_font(50), "#444", W); y += 68
        draw.line([(200, y), (W-200, y)], fill="#ccc", width=2); y += 30
        _draw_centered(draw, title_line, y, _get_font(88, bold=True), "#111", W); y += 112
        if subtitle_line:
            _draw_centered(draw, subtitle_line, y, _get_font(44), "#333", W); y += 58
        for line in extra_lines:
            _draw_centered(draw, line, y, _get_font(34), "#555", W); y += 44
        if extra_lines:
            y += 10
        draw.line([(200, y), (W-200, y)], fill="#ccc", width=1); y += 30
        _draw_centered(draw, body_line, y, _get_font(48), "#333", W); y += 65
        if body2_line:
            _draw_centered(draw, body2_line, y, _get_font(36), "#666", W)
        _draw_centered(draw, date.today().strftime("%d.%m.%Y"), H-120, _get_font(40), "#999", W)
        draw.rectangle([80, H-100, W-80, H-60], fill="#eee")

    return img


def _generate_stock_pdf(stock_key, recipient_name, tournament_name, cert_type) -> bytes:
    """Індивідуальний сертифікат (одиночний турнір)."""
    W, H = 2480, 1754
    cert_type_label = CERT_TYPE_DISPLAY.get(cert_type, cert_type)
    img = _render_stock(
        stock_key, W, H,
        title_line=recipient_name,
        subtitle_line="",
        body_line=f"за участь у турнірі «{tournament_name}»",
        body2_line="",
        extra_lines=[],
        cert_type_label=cert_type_label,
    )
    return _img_to_pdf(img)


def _generate_stock_team_pdf(stock_key, team_name, captain_name,
                              member_names, tournament_name, cert_type) -> bytes:
    """Командний сертифікат — назва команди + склад."""
    W, H = 2480, 1754
    cert_type_label = CERT_TYPE_DISPLAY.get(cert_type, cert_type)

    # Склад: капітан першим, потім інші
    all_names = [f"Капітан: {captain_name}"] + [f"• {n}" for n in member_names]

    img = _render_stock(
        stock_key, W, H,
        title_line=f"Команда «{team_name}»",
        subtitle_line="Склад команди:",
        body_line=f"за участь у турнірі «{tournament_name}»",
        body2_line="",
        extra_lines=all_names,
        cert_type_label=cert_type_label,
    )
    return _img_to_pdf(img)


def _generate_pdf(template, recipient_name, tournament_name) -> bytes:
    """PDF з власного макету (завантаженого зображення)."""
    from PIL import Image, ImageDraw
    from reportlab.pdfgen import canvas

    img = Image.open(template.template_image.path).convert("RGBA")
    draw = ImageDraw.Draw(img)
    w, h = img.size

    def get_font(size):
        for path in ["C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf",
                     "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
            if os.path.exists(path):
                try:
                    return __import__('PIL').ImageFont.truetype(path, size)
                except Exception:
                    pass
        return __import__('PIL').ImageFont.load_default()

    def draw_centered(text, x_pct, y_pct, font_size, color_hex):
        font = get_font(font_size)
        x = int(w * x_pct / 100)
        y = int(h * y_pct / 100)
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        draw.text((x - tw // 2, y), text, font=font, fill=color_hex)

    draw_centered(recipient_name,
                  template.name_x_percent, template.name_y_percent,
                  template.name_font_size, template.name_font_color)
    draw_centered(tournament_name,
                  template.tournament_name_x_percent, template.tournament_name_y_percent,
                  template.tournament_font_size, template.tournament_font_color)
    draw_centered(date.today().strftime("%d.%m.%Y"),
                  template.date_x_percent, template.date_y_percent,
                  template.date_font_size, template.date_font_color)

    return _img_to_pdf(img)


# ── Views ─────────────────────────────────────────────────────────────────────

class StockTemplateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        if not _get_role(request.user, tournament_pk):
            return Response({'detail': 'Доступ заборонено.'}, status=403)
        return Response([{"key": k, **v} for k, v in STOCK_TEMPLATES.items()])


class StockTemplateGenerateView(APIView):
    """
    POST /tournaments/<id>/certificates/stock-generate/
    Body:
      Individual: { cert_type, stock_key, user_ids: [..] }  — [] = всі учасники
      Team:       { cert_type, stock_key, team_ids: [..] }  — [] = всі команди
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, tournament_pk):
        if not _is_admin(request.user, tournament_pk):
            return Response({'detail': 'Тільки власник або адмін.'}, status=403)

        cert_type = request.data.get('cert_type', 'participant')
        stock_key = request.data.get('stock_key', 'classic')
        user_ids  = request.data.get('user_ids', None)   # None = не передано
        team_ids  = request.data.get('team_ids',  None)

        if cert_type not in dict(CERT_TYPE_CHOICES):
            return Response({'detail': 'Невірний тип сертифіката.'}, status=400)
        if stock_key not in STOCK_TEMPLATES:
            return Response({'detail': 'Невірний стоковий шаблон.'}, status=400)

        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        generated, errors = 0, []

        # ── Командний режим ──────────────────────────────────────────────────
        if team_ids is not None:
            teams_qs = Team.objects.filter(tournament=tournament, status='registered')
            if team_ids:
                teams_qs = teams_qs.filter(id__in=team_ids)

            for team in teams_qs.prefetch_related('members__user'):
                captain_name = ""
                member_names = []
                for tm in team.members.filter(status='accepted').select_related('user'):
                    full = f"{tm.user.first_name} {tm.user.last_name}".strip() or tm.user.username
                    if tm.user_id == team.captain_id:
                        captain_name = full
                    else:
                        member_names.append(full)

                try:
                    pdf_bytes = _generate_stock_team_pdf(
                        stock_key, team.name, captain_name,
                        member_names, tournament.name, cert_type,
                    )
                except Exception as e:
                    errors.append({'team_id': team.id, 'error': str(e)})
                    continue

                filename = f"cert_team_{tournament_pk}_{team.id}_{cert_type}.pdf"

                # Сертифікат прив'язуємо до капітана як представника команди
                if team.captain_id:
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    try:
                        captain = User.objects.get(pk=team.captain_id)
                        cert, _ = Certificate.objects.get_or_create(
                            tournament=tournament,
                            recipient=captain,
                            cert_type=f"{cert_type}_team_{team.id}",
                            defaults={'template': None},
                        )
                        cert.template = None
                        if cert.pdf_file:
                            cert.pdf_file.delete(save=False)
                        cert.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
                        generated += 1
                    except Exception as e:
                        errors.append({'team_id': team.id, 'error': str(e)})

        # ── Індивідуальний режим ─────────────────────────────────────────────
        else:
            members_qs = TournamentMember.objects.filter(
                tournament=tournament, role='participant',
            ).select_related('user')
            if user_ids:
                members_qs = members_qs.filter(user_id__in=user_ids)

            for member in members_qs:
                user = member.user
                full_name = f"{user.first_name} {user.last_name}".strip() or user.username
                try:
                    pdf_bytes = _generate_stock_pdf(stock_key, full_name, tournament.name, cert_type)
                except Exception as e:
                    errors.append({'user_id': user.id, 'error': str(e)})
                    continue

                filename = f"cert_stock_{tournament_pk}_{user.id}_{cert_type}.pdf"
                cert, _ = Certificate.objects.get_or_create(
                    tournament=tournament, recipient=user, cert_type=cert_type,
                    defaults={'template': None},
                )
                cert.template = None
                if cert.pdf_file:
                    cert.pdf_file.delete(save=False)
                cert.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
                generated += 1

        return Response({'generated': generated, 'errors': errors}, status=201)


class CertificateTemplateListView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        if not _get_role(request.user, tournament_pk):
            return Response({'detail': 'Доступ заборонено.'}, status=403)
        templates = CertificateTemplate.objects.filter(tournament_id=tournament_pk)
        return Response([_tmpl_repr(t, request) for t in templates])

    def post(self, request, tournament_pk):
        if not _is_admin(request.user, tournament_pk):
            return Response({'detail': 'Тільки власник або адмін.'}, status=403)
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)

        cert_type = request.data.get('cert_type', 'participant')
        if cert_type not in dict(CERT_TYPE_CHOICES):
            return Response({'detail': 'Невірний тип сертифіката.'}, status=400)
        image = request.FILES.get('template_image')
        if not image:
            return Response({'detail': "template_image обов'язковий."}, status=400)

        fields = [
            'name_x_percent', 'name_y_percent', 'name_font_size', 'name_font_color',
            'tournament_name_x_percent', 'tournament_name_y_percent',
            'tournament_font_size', 'tournament_font_color',
            'date_x_percent', 'date_y_percent', 'date_font_size', 'date_font_color',
        ]
        tmpl, _ = CertificateTemplate.objects.get_or_create(tournament=tournament, cert_type=cert_type)
        if tmpl.template_image:
            tmpl.template_image.delete(save=False)
        tmpl.template_image = image
        for field in fields:
            val = request.data.get(field)
            if val is not None:
                setattr(tmpl, field, val)
        tmpl.save()
        return Response(_tmpl_repr(tmpl, request), status=201)


class CertificateTemplateDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def _get(self, tournament_pk, tmpl_id):
        try:
            return CertificateTemplate.objects.get(pk=tmpl_id, tournament_id=tournament_pk)
        except CertificateTemplate.DoesNotExist:
            return None

    def get(self, request, tournament_pk, tmpl_id):
        tmpl = self._get(tournament_pk, tmpl_id)
        if not tmpl:
            return Response({'detail': 'Шаблон не знайдено.'}, status=404)
        return Response(_tmpl_repr(tmpl, request))

    def patch(self, request, tournament_pk, tmpl_id):
        if not _is_admin(request.user, tournament_pk):
            return Response({'detail': 'Тільки власник або адмін.'}, status=403)
        tmpl = self._get(tournament_pk, tmpl_id)
        if not tmpl:
            return Response({'detail': 'Шаблон не знайдено.'}, status=404)
        fields = [
            'name_x_percent', 'name_y_percent', 'name_font_size', 'name_font_color',
            'tournament_name_x_percent', 'tournament_name_y_percent',
            'tournament_font_size', 'tournament_font_color',
            'date_x_percent', 'date_y_percent', 'date_font_size', 'date_font_color',
        ]
        for field in fields:
            if field in request.data:
                setattr(tmpl, field, request.data[field])
        if 'template_image' in request.FILES:
            if tmpl.template_image:
                tmpl.template_image.delete(save=False)
            tmpl.template_image = request.FILES['template_image']
        tmpl.save()
        return Response(_tmpl_repr(tmpl, request))

    def delete(self, request, tournament_pk, tmpl_id):
        if not _is_admin(request.user, tournament_pk):
            return Response({'detail': 'Тільки власник або адмін.'}, status=403)
        tmpl = self._get(tournament_pk, tmpl_id)
        if not tmpl:
            return Response({'detail': 'Шаблон не знайдено.'}, status=404)
        if tmpl.template_image:
            tmpl.template_image.delete(save=False)
        tmpl.delete()
        return Response(status=204)


class CertificateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk):
        role = _get_role(request.user, tournament_pk)
        if not role:
            return Response({'detail': 'Доступ заборонено.'}, status=403)
        if _is_admin(request.user, tournament_pk):
            certs = Certificate.objects.filter(tournament_id=tournament_pk).select_related('recipient', 'template')
        else:
            certs = Certificate.objects.filter(
                tournament_id=tournament_pk, recipient=request.user,
            ).select_related('recipient', 'template')

        # Будуємо словник recipient_id -> team_name для цього турніру
        team_map = {}
        for tm in TeamMember.objects.filter(
            team__tournament_id=tournament_pk, status='accepted',
        ).select_related('team'):
            team_map[tm.user_id] = tm.team.name
        # Капітани теж входять до команди
        for team in Team.objects.filter(tournament_id=tournament_pk):
            if team.captain_id and team.captain_id not in team_map:
                team_map[team.captain_id] = team.name

        return Response([_cert_repr(c, request, team_map) for c in certs])


class CertificateGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tournament_pk):
        if not _is_admin(request.user, tournament_pk):
            return Response({'detail': 'Тільки власник або адмін.'}, status=403)
        cert_type = request.data.get('cert_type', 'participant')
        if cert_type not in dict(CERT_TYPE_CHOICES):
            return Response({'detail': 'Невірний тип сертифіката.'}, status=400)
        try:
            tournament = Tournament.objects.get(pk=tournament_pk)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Турнір не знайдено.'}, status=404)
        try:
            tmpl = CertificateTemplate.objects.get(tournament=tournament, cert_type=cert_type)
        except CertificateTemplate.DoesNotExist:
            return Response({'detail': f'Шаблон для «{CERT_TYPE_DISPLAY[cert_type]}» не знайдено.'}, status=400)

        user_ids = request.data.get('user_ids', [])
        if user_ids:
            members = list(TournamentMember.objects.filter(tournament=tournament, user_id__in=user_ids).select_related('user'))
        else:
            members = list(TournamentMember.objects.filter(tournament=tournament, role='participant').select_related('user'))

        generated, errors = 0, []
        for member in members:
            user = member.user
            full_name = f"{user.first_name} {user.last_name}".strip() or user.username
            try:
                pdf_bytes = _generate_pdf(tmpl, full_name, tournament.name)
            except Exception as e:
                errors.append({'user_id': user.id, 'error': str(e)})
                continue
            filename = f"cert_{tournament_pk}_{user.id}_{cert_type}.pdf"
            cert, _ = Certificate.objects.get_or_create(
                tournament=tournament, recipient=user, cert_type=cert_type,
                defaults={'template': tmpl},
            )
            cert.template = tmpl
            if cert.pdf_file:
                cert.pdf_file.delete(save=False)
            cert.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
            generated += 1
        return Response({'generated': generated, 'errors': errors}, status=201)


class CertificateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_cert(self, tournament_pk, cert_id):
        try:
            return Certificate.objects.get(pk=cert_id, tournament_id=tournament_pk)
        except Certificate.DoesNotExist:
            return None

    def get(self, request, tournament_pk, cert_id):
        cert = self._get_cert(tournament_pk, cert_id)
        if not cert:
            return Response({'detail': 'Сертифікат не знайдено.'}, status=404)
        if not _is_admin(request.user, tournament_pk) and cert.recipient != request.user:
            return Response({'detail': 'Доступ заборонено.'}, status=403)
        if not cert.pdf_file:
            return Response({'detail': 'PDF ще не згенеровано.'}, status=404)
        response = FileResponse(cert.pdf_file.open('rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="certificate_{cert.recipient.username}_{cert.cert_type}.pdf"'
        return response

    def delete(self, request, tournament_pk, cert_id):
        if not _is_admin(request.user, tournament_pk):
            return Response({'detail': 'Тільки власник або адмін.'}, status=403)
        cert = self._get_cert(tournament_pk, cert_id)
        if not cert:
            return Response({'detail': 'Сертифікат не знайдено.'}, status=404)
        if cert.pdf_file:
            cert.pdf_file.delete(save=False)
        cert.delete()
        return Response(status=204)


class CertificateDownloadView(APIView):
    """GET /tournaments/<tournament_pk>/certificates/<cert_id>/download/
    Повертає PDF-файл сертифіката як вкладення (attachment).
    Доступно власнику сертифіката або адміну турніру.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, tournament_pk, cert_id):
        try:
            cert = Certificate.objects.get(pk=cert_id, tournament_id=tournament_pk)
        except Certificate.DoesNotExist:
            return Response({'detail': 'Сертифікат не знайдено.'}, status=404)
        if not _is_admin(request.user, tournament_pk) and cert.recipient != request.user:
            return Response({'detail': 'Доступ заборонено.'}, status=403)
        if not cert.pdf_file:
            return Response({'detail': 'PDF ще не згенеровано.'}, status=404)
        response = FileResponse(cert.pdf_file.open('rb'), content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="certificate_{cert.recipient.username}_{cert.cert_type}.pdf"'
        )
        return response


class MyCertificatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        certs = Certificate.objects.filter(recipient=request.user).select_related('tournament', 'template')
        return Response([_cert_repr(c, request) for c in certs])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tmpl_repr(tmpl, request):
    return {
        'id': tmpl.id, 'cert_type': tmpl.cert_type,
        'cert_type_display': CERT_TYPE_DISPLAY.get(tmpl.cert_type, tmpl.cert_type),
        'template_image': request.build_absolute_uri(tmpl.template_image.url) if tmpl.template_image else None,
        'name_x_percent': tmpl.name_x_percent, 'name_y_percent': tmpl.name_y_percent,
        'name_font_size': tmpl.name_font_size, 'name_font_color': tmpl.name_font_color,
        'tournament_name_x_percent': tmpl.tournament_name_x_percent,
        'tournament_name_y_percent': tmpl.tournament_name_y_percent,
        'tournament_font_size': tmpl.tournament_font_size,
        'tournament_font_color': tmpl.tournament_font_color,
        'date_x_percent': tmpl.date_x_percent, 'date_y_percent': tmpl.date_y_percent,
        'date_font_size': tmpl.date_font_size, 'date_font_color': tmpl.date_font_color,
        'uploaded_at': tmpl.uploaded_at,
    }


def _cert_repr(cert, request, team_map=None):
    return {
        'id': cert.id, 'template': cert.template_id,
        'cert_type': cert.cert_type,
        'cert_type_display': CERT_TYPE_DISPLAY.get(cert.cert_type, cert.cert_type),
        'recipient_id': cert.recipient_id,
        'recipient_name': f"{cert.recipient.first_name} {cert.recipient.last_name}".strip() or cert.recipient.username,
        'recipient_email': cert.recipient.email,
        'pdf_file': request.build_absolute_uri(cert.pdf_file.url) if cert.pdf_file else None,
        'issued_at': cert.issued_at,
        'tournament_id': cert.tournament_id,
        'tournament_name': cert.tournament.name if cert.tournament else '',
        'team_name': (team_map or {}).get(cert.recipient_id, ''),
    }