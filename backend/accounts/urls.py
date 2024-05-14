from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, ModuleViewSet, TaskViewSet, csrf, current_time, login_view, logout_view, user_profile, register

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'modules', ModuleViewSet)
router.register(r'tasks', TaskViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('csrf/', csrf, name='csrf'),
    path('time/', current_time, name='current-time'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('profile/', user_profile, name='profile'),
    path('register/', register, name='register'),
]
