from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout, get_user_model
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]  # Default permission

    def get_permissions(self):
        # Override permissions based on action
        if self.action in ['register', 'login', 'logout', 'check_auth']:
            return [permissions.AllowAny()]
        return super(UserViewSet, self).get_permissions()

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        # Custom registration logic (if needed) or call the create method directly
        return super(UserViewSet, self).create(request)

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, email=email, password=password)
        if user:
            login(request, user)
            return Response({"success": "User logged in"})
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'], url_path='logout')
    def logout(self, request):
        logout(request)
        return Response({"success": "User logged out"})

    @action(detail=False, methods=['get'], url_path='auth')
    def check_auth(self, request):
        # This will only be reached if the user is authenticated due to the permissions.
        return Response({
            'user_id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_authenticated': True
        }, status=status.HTTP_200_OK)
