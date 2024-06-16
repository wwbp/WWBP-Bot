from django.db import models


class Transcript(models.Model):
    session = models.ForeignKey(
        'accounts.ChatSession', on_delete=models.CASCADE, related_name='chat_sessions')
    message_id = models.IntegerField()
    user_message = models.TextField(blank=True, null=True)
    bot_message = models.TextField(blank=True, null=True)
    has_audio = models.BooleanField(default=False)
    audio_link = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
