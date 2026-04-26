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


class RoundLink(models.Model):
    """Посилання, прикріплені до раунду."""
    round = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="links")
    label = models.CharField(max_length=255, verbose_name="Підпис посилання")
    url   = models.URLField(max_length=2048, verbose_name="URL")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.round.title} — {self.label}"


class RoundAttachment(models.Model):
    """Файли, прикріплені до раунду."""
    round      = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="rounds/attachments/", verbose_name="Файл")
    name       = models.CharField(max_length=255, verbose_name="Назва файлу", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.round.title} — {self.name}"


class Task(models.Model):
    """Завдання всередині раунду."""
    round       = models.ForeignKey(Round, on_delete=models.CASCADE, related_name="tasks")
    title       = models.CharField(max_length=255, verbose_name="Назва завдання")
    description = models.TextField(null=True, blank=True, verbose_name="Опис завдання")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.round.title} — {self.title}"


class TaskLink(models.Model):
    """Посилання, прикріплені до завдання."""
    task  = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="links")
    label = models.CharField(max_length=255, verbose_name="Підпис")
    url   = models.URLField(max_length=2048, verbose_name="URL")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class TaskAttachment(models.Model):
    """Файли, прикріплені до завдання."""
    task       = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="attachments")
    file       = models.FileField(upload_to="tasks/attachments/", verbose_name="Файл")
    name       = models.CharField(max_length=255, verbose_name="Назва файлу", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        if not self.name and self.file:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)
