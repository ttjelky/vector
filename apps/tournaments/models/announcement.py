from django.db import models

from .tournament import Tournament


ANNOUNCEMENT_TARGET_CHOICES = [
    ('all',         'Усі учасники'),
    ('participant', 'Учасники'),
    ('jury',        'Журі'),
    ('admin',       'Адміністратори'),
    ('owner',       'Власник'),
]


class Announcement(models.Model):
    tournament  = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name='announcements'
    )
    author      = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, related_name='announcements'
    )
    title       = models.CharField(max_length=200, verbose_name='Заголовок')
    body        = models.TextField(blank=True, verbose_name='Текст')
    target_role = models.CharField(
        max_length=20, choices=ANNOUNCEMENT_TARGET_CHOICES,
        default='all', verbose_name='Аудиторія',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Оголошення'
        verbose_name_plural = 'Оголошення'

    def __str__(self):
        return f'[{self.tournament}] {self.title}'


class AnnouncementComment(models.Model):
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name='comments'
    )
    author     = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, related_name='announcement_comments'
    )
    text       = models.TextField(verbose_name='Текст')
    parent     = models.ForeignKey(
        'self', on_delete=models.CASCADE,
        null=True, blank=True, related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Коментар'
        verbose_name_plural = 'Коментарі'

    def __str__(self):
        return f'{self.author} → [{self.announcement}]'


class AnnouncementReaction(models.Model):
    """
    Реакція на Оголошення АБО Коментар (nullable FK).
    Toggle: той самий emoji — знімаємо; інший — замінюємо.
    """
    user         = models.ForeignKey('users.User', on_delete=models.CASCADE)
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE,
        null=True, blank=True, related_name='reactions'
    )
    comment = models.ForeignKey(
        AnnouncementComment, on_delete=models.CASCADE,
        null=True, blank=True, related_name='reactions'
    )
    emoji      = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'announcement'],
                condition=models.Q(announcement__isnull=False),
                name='unique_ann_reaction_per_user',
            ),
            models.UniqueConstraint(
                fields=['user', 'comment'],
                condition=models.Q(comment__isnull=False),
                name='unique_comment_reaction_per_user',
            ),
        ]
        verbose_name = 'Реакція'
        verbose_name_plural = 'Реакції'
