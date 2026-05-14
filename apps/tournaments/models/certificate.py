from django.db import models

from .tournament import Tournament


CERT_TYPE_CHOICES = [
    ('participant', 'Учасник'),
    ('winner',      'Переможець (1 місце)'),
    ('top3',        'Призери (2–3 місце)'),
    ('jury',        'Журі'),
]


class CertificateTemplate(models.Model):
    """Макет сертифіката (PNG/JPG зображення) для конкретного типу."""
    tournament     = models.ForeignKey(
        Tournament, on_delete=models.CASCADE,
        related_name='certificate_templates',
    )
    cert_type      = models.CharField(max_length=20, choices=CERT_TYPE_CHOICES, default='participant')
    template_image = models.ImageField(upload_to='certificates/templates/')

    # Позиція імені отримувача (у % від розміру зображення)
    name_x_percent  = models.FloatField(default=50.0)
    name_y_percent  = models.FloatField(default=52.0)
    name_font_size  = models.IntegerField(default=72)
    name_font_color = models.CharField(max_length=20, default='#1a1a1a')

    # Позиція назви турніру
    tournament_name_x_percent = models.FloatField(default=50.0)
    tournament_name_y_percent = models.FloatField(default=65.0)
    tournament_font_size      = models.IntegerField(default=36)
    tournament_font_color     = models.CharField(max_length=20, default='#444444')

    # Позиція дати
    date_x_percent  = models.FloatField(default=50.0)
    date_y_percent  = models.FloatField(default=75.0)
    date_font_size  = models.IntegerField(default=28)
    date_font_color = models.CharField(max_length=20, default='#666666')

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'cert_type')

    def __str__(self):
        return f"{self.tournament.name} — {self.cert_type}"


class Certificate(models.Model):
    """Виданий іменний сертифікат."""
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='certificates',
    )
    template = models.ForeignKey(
        CertificateTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='certificates',
    )
    recipient = models.ForeignKey(
        'users.User', on_delete=models.CASCADE,
        related_name='certificates', verbose_name='Отримувач',
    )
    cert_type = models.CharField(max_length=20, choices=CERT_TYPE_CHOICES, default='participant')
    pdf_file  = models.FileField(upload_to='certificates/generated/', null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'recipient', 'cert_type')
        ordering = ['-issued_at']

    def __str__(self):
        return f"{self.recipient.username} — {self.cert_type} — {self.tournament.name}"
