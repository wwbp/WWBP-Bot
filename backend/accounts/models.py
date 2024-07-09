from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('teacher', 'Teacher'),
        ('admin', 'Admin'),
    )
    role = models.CharField(
        max_length=10, choices=ROLE_CHOICES, default='student')
    grade = models.CharField(max_length=10, blank=True, null=True)
    preferred_language = models.CharField(max_length=50, blank=True, null=True)


class Module(models.Model):
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='modules')
    content = models.TextField(blank=True, null=True)
    files = models.JSONField(default=list, blank=True,
                             null=True)


class Task(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    module = models.ForeignKey(
        Module, on_delete=models.CASCADE, related_name='tasks')
    instruction_prompt = models.TextField(blank=True, null=True)
    persona_prompt = models.TextField(blank=True, null=True)
    files = models.JSONField(default=list, blank=True,
                             null=True)


class ChatSession(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_sessions')
    module = models.ForeignKey(
        Module, on_delete=models.CASCADE, related_name='chat_sessions', null=True, blank=True)
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name='chat_sessions', null=True, blank=True)
    assistant_id = models.TextField(blank=True, null=True)
    thread_id = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ChatMessage(models.Model):
    session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, related_name='messages')
    message = models.TextField()
    sender = models.CharField(max_length=10, choices=(
        ('student', 'Student'), ('bot', 'Bot')))
    created_at = models.DateTimeField(auto_now_add=True)


class SystemPrompt(models.Model):
    prompt = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
