# Generated by Django 4.2.16 on 2024-09-16 19:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0020_task_persona'),
    ]

    operations = [
        migrations.AddField(
            model_name='persona',
            name='avatar_url',
            field=models.URLField(blank=True, max_length=255, null=True),
        ),
    ]
