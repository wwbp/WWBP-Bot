# Generated by Django 4.2.14 on 2024-08-02 18:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_delete_chatmessage'),
    ]

    operations = [
        migrations.AddField(
            model_name='module',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='task',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
