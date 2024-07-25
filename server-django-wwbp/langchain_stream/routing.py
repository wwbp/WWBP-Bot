from django.urls import re_path
from .views import ChatConsumer, AudioConsumer

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<session_id>\w+)/$', ChatConsumer.as_asgi()),
    re_path(r'ws/audio/(?P<session_id>\w+)/$', AudioConsumer.as_asgi()),
]
