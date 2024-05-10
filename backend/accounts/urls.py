from django.urls import path
from .views import current_time, login_view, logout_view, user_profile, register

urlpatterns = [
    path('time/', current_time, name='current-time'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('profile/', user_profile, name='profile'),
    path('register/', register, name='register'),
]
