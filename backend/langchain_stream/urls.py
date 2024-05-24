from django.urls import path
from . import views


urlpatterns = [
    path(r'ws/chat/(?P<session_id>\w+)/$', views.ChatConsumer.as_asgi()),
]
