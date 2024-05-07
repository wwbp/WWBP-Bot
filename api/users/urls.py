from django.urls import path
from .views import UserCreate, LoginView, LogoutView, UserDetailUpdate

urlpatterns = [
    path('register/', UserCreate.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('<int:user_id>/', UserDetailUpdate.as_view(), name='user-detail-update'),
    path('', UserDetailUpdate.as_view(), name='user-list'),  # If you need to list or manage all users
]
