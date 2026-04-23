from django.db import models

class Tournament(models.Model):
    # Текстові поля
    name = models.CharField(max_length=255, verbose_name="Назва турніру")
    description = models.TextField(verbose_name="Опис")
    rules = models.TextField(null=True, blank=True, verbose_name="Правила")
    
    # Поля вибору та налаштувань
    image_mode = models.CharField(max_length=50, default="stock")
    stock_image = models.CharField(max_length=255, null=True, blank=True)
    accent_color = models.CharField(max_length=20, default="#378ADD")
    format = models.CharField(max_length=100, null=True, blank=True)
    
    # Дати
    start_date = models.DateTimeField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end = models.DateTimeField(null=True, blank=True)
    
    # Числові значення
    max_teams = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name