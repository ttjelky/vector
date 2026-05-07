# Збережи цей файл як:
# <твій_app>/migrations/XXXX_add_leaderboard_published.py
# де XXXX — наступний номер після твоєї останньої міграції
#
# У dependencies заміни ('tournaments', '0001_initial') на свою останню міграцію.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tournaments', '0001_initial'),  # ← змінити на свою останню міграцію
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='leaderboard_published',
            field=models.BooleanField(default=False, verbose_name='Таблиця лідерів опублікована'),
        ),
    ]
