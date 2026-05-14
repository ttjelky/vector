"""
Генерує іменний PDF-сертифікат на основі зображення-макету.
 
Залежності (додати до requirements.txt):
    Pillow>=10.0.0
    reportlab>=4.0.0
 
Логіка:
  1. Відкрити template_image (PNG/JPG) як фон.
  2. Накласти текст (ім'я, турнір, дата) у вказаних координатах.
  3. Зберегти результат як PDF через reportlab (canvas).
"""
 
from __future__ import annotations
 
import io
import os
from datetime import date
from pathlib import Path
 
from PIL import Image, ImageDraw, ImageFont
from django.conf import settings
from django.core.files.base import ContentFile
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
 
 
# ── Шрифт ─────────────────────────────────────────────────────────────────────
# Помістіть DejaVuSans.ttf у media/fonts/ або вкажіть інший TTF з підтримкою кирилиці.
FONT_DIR = Path(settings.BASE_DIR) / 'media' / 'fonts'
FONT_PATH = FONT_DIR / 'DejaVuSans.ttf'
FONT_BOLD_PATH = FONT_DIR / 'DejaVuSans-Bold.ttf'
 
 
def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """'#1a2b3c' → (26, 43, 60)"""
    h = hex_color.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
 
 
def _get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = FONT_BOLD_PATH if bold else FONT_PATH
    try:
        return ImageFont.truetype(str(path), size)
    except (OSError, IOError):
        # Fallback — без кирилиці, але хоча б не впаде
        return ImageFont.load_default()
 
 
def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    img_width: int,
    img_height: int,
    text: str,
    x_pct: float,
    y_pct: float,
    font: ImageFont.FreeTypeFont,
    color: str,
) -> None:
    """Малює текст з центруванням по горизонталі відносно x_pct."""
    rgb = _hex_to_rgb(color)
    x_center = int(img_width * x_pct / 100)
    y_center = int(img_height * y_pct / 100)
 
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
 
    x = x_center - text_w // 2
    y = y_center - text_h // 2
    draw.text((x, y), text, font=font, fill=rgb)
 
 
def generate_certificate_pdf(
    template,          # CertificateTemplate instance
    recipient_name: str,
    issued_date: date | None = None,
) -> ContentFile:
    """
    Повертає ContentFile з байтами PDF-сертифіката.
 
    Використання у view:
        content = generate_certificate_pdf(tmpl, "Іван Франко")
        cert.pdf_file.save(f"cert_{cert.pk}.pdf", content, save=True)
    """
    if issued_date is None:
        issued_date = date.today()
 
    # ── 1. Відкрити фон ───────────────────────────────────────────────────────
    img_path = template.template_image.path
    bg = Image.open(img_path).convert('RGBA')
    img_w, img_h = bg.size
 
    # ── 2. Шар для тексту ─────────────────────────────────────────────────────
    overlay = Image.new('RGBA', bg.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
 
    # Ім'я отримувача (жирний)
    font_name = _get_font(template.name_font_size, bold=True)
    _draw_centered_text(
        draw, img_w, img_h,
        recipient_name,
        template.name_x_percent, template.name_y_percent,
        font_name, template.name_font_color,
    )
 
    # Назва турніру
    font_tournament = _get_font(template.tournament_font_size)
    _draw_centered_text(
        draw, img_w, img_h,
        template.tournament.name,
        template.tournament_name_x_percent, template.tournament_name_y_percent,
        font_tournament, template.tournament_font_color,
    )
 
    # Дата
    font_date = _get_font(template.date_font_size)
    date_str = issued_date.strftime('%d.%m.%Y')
    _draw_centered_text(
        draw, img_w, img_h,
        date_str,
        template.date_x_percent, template.date_y_percent,
        font_date, template.date_font_color,
    )
 
    # ── 3. Злити шари ─────────────────────────────────────────────────────────
    combined = Image.alpha_composite(bg, overlay).convert('RGB')
 
    # ── 4. Зберегти в буфер як PNG ────────────────────────────────────────────
    img_buf = io.BytesIO()
    combined.save(img_buf, format='PNG', dpi=(150, 150))
    img_buf.seek(0)
 
    # ── 5. Обгорнути в PDF через reportlab ────────────────────────────────────
    pdf_buf = io.BytesIO()
    # A4 landscape у пунктах: 842 × 595
    pdf_w, pdf_h = 842, 595
    c = rl_canvas.Canvas(pdf_buf, pagesize=(pdf_w, pdf_h))
 
    img_reader = ImageReader(img_buf)
    c.drawImage(img_reader, 0, 0, width=pdf_w, height=pdf_h, preserveAspectRatio=False)
    c.save()
 
    pdf_buf.seek(0)
    return ContentFile(pdf_buf.read())
 
 
def bulk_generate_certificates(template, queryset):
    """
    Генерує сертифікати для queryset користувачів (User).
    Повертає список створених об'єктів Certificate.
 
    Приклад:
        members = tournament.members.filter(role='participant')
        users = [m.user for m in members]
        bulk_generate_certificates(participant_template, users)
    """
    from .models import Certificate  # уникаємо циклічного імпорту
 
    created = []
    today = date.today()
 
    for user in queryset:
        cert, _ = Certificate.objects.get_or_create(
            template=template,
            recipient=user,
        )
        if cert.pdf_file:
            # Вже згенерований — пропускаємо
            created.append(cert)
            continue
 
        full_name = user.get_full_name().strip() or user.username
        pdf_content = generate_certificate_pdf(template, full_name, today)
        filename = f"cert_{template.cert_type}_{user.pk}_{today.strftime('%Y%m%d')}.pdf"
        cert.pdf_file.save(filename, pdf_content, save=True)
        created.append(cert)
 
    return created