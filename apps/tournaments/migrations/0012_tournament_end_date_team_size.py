from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Заміни '0001_initial' на назву своєї останньої міграції
        ('tournaments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='end_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tournament',
            name='min_team_size',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tournament',
            name='max_team_size',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
