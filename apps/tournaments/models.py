from django.db import models


class Tournament(models.Model):
    # Текстові поля
    name        = models.CharField(max_length=255, verbose_name="Назва турніру")
    description = models.TextField(verbose_name="Опис")
    rules       = models.TextField(null=True, blank=True, verbose_name="Правила")

    # Поля вибору та налаштувань
    image_mode   = models.CharField(max_length=50, default="stock")
    stock_image  = models.CharField(max_length=255, null=True, blank=True)
    accent_color = models.CharField(max_length=20, default="#378ADD")
    format       = models.CharField(max_length=100, null=True, blank=True)
    custom_image = models.ImageField(
        upload_to='tournaments/custom/', null=True, blank=True, verbose_name="Власна обкладинка"
    )

    # Дати
    start_date         = models.DateTimeField(null=True, blank=True)
    registration_start = models.DateTimeField(null=True, blank=True)
    registration_end   = models.DateTimeField(null=True, blank=True)

    # Числові значення
    max_teams = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.name


class Round(models.Model):
    tournament  = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="rounds")
    title       = models.CharField(max_length=255, verbose_name="Назва")
    description = models.TextField(null=True, blank=True, verbose_name="Опис")
    start_date  = models.DateTimeField(null=True, blank=True, verbose_name="Початок")
    end_date    = models.DateTimeField(null=True, blank=True, verbose_name="Кінець")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.tournament.name} — {self.title}"
