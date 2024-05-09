from django.urls import path
from .views import current_time

urlpatterns = [
    path('time/', current_time, name='current-time'),
]
