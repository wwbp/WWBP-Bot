from django.urls import re_path
from . import views

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<session_id>\w+)/$', views.ChatConsumer.as_asgi()),
]
