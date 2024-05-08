from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, test_csp

router = DefaultRouter()
router.register(r'', UserViewSet, basename='users')

urlpatterns = [
    path('', include(router.urls)),
    path('test-csp/', test_csp),  # Add this line for the test URL
]
