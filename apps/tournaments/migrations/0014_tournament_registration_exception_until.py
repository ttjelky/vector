from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Заміни '0001_initial' на назву твоєї останньої міграції
        ('tournaments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='registration_exception_until',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Реєстрація відкрита до (виняток)',
            ),
        ),
    ]
