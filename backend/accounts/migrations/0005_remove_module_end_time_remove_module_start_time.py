# Generated by Django 4.2.13 on 2024-06-11 16:18

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_chatsession_task_alter_chatsession_module'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='module',
            name='end_time',
        ),
        migrations.RemoveField(
            model_name='module',
            name='start_time',
        ),
    ]
