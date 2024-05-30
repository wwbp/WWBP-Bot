from django.urls import path
from .views import ChatConsumer, AudioConsumer


urlpatterns = [
    path(r'ws/chat/(?P<session_id>\w+)/$', ChatConsumer.as_asgi()),
    path(r'ws/audio/(?P<session_id>\w+)/$', AudioConsumer.as_asgi())
]
