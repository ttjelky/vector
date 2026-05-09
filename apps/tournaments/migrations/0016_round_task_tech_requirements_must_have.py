from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Вкажи назву свого додатку і номер попередньої міграції
        # Наприклад: ('tournaments', '0001_initial')
        ('tournaments', '0001_initial'),
    ]

    operations = [
        # ── Round ────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='round',
            name='tech_requirements',
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name='Вимоги до технологій',
                help_text="Список об'єктів [{category, value}]",
            ),
        ),
        migrations.AddField(
            model_name='round',
            name='must_have',
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name="Must have — обов'язкові критерії",
                help_text='Список рядків ["вимога 1", "вимога 2"]',
            ),
        ),

        # ── Task ─────────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='task',
            name='tech_requirements',
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name='Вимоги до технологій',
                help_text="Список об'єктів [{category, value}]",
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='must_have',
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name="Must have — обов'язкові критерії",
                help_text='Список рядків ["вимога 1", "вимога 2"]',
            ),
        ),
    ]
