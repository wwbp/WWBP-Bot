from django.contrib import admin
from django.urls import include, path
from accounts.views import csrf

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('accounts.urls')),
    path('api/csrf/', csrf, name='csrf'),
]
