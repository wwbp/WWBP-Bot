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
    description = models.TextField()
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='modules')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    assigned_students = models.ManyToManyField(
        User, related_name='assigned_modules')


class Task(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    module = models.ForeignKey(
        Module, on_delete=models.CASCADE, related_name='tasks')
