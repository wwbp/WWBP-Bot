from django.contrib.auth import authenticate, login, logout
from rest_framework import views, status, permissions
from rest_framework.response import Response
from .serializers import UserSerializer
from django.contrib.auth import get_user_model

# Register new users
class UserCreate(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": "User created successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Login users
class LoginView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, email=email, password=password)
        if user:
            login(request, user)
            return Response({"success": "User logged in"})
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

# Logout users
class LogoutView(views.APIView):
    def post(self, request):
        logout(request)
        return Response({"success": "User logged out"})

# User detail and update
class UserDetailUpdate(views.APIView):
    def get(self, request, user_id):
        user = get_user_model().objects.get(id=user_id)
        serializer = UserSerializer(user)
        return Response(serializer.data)

    def put(self, request, user_id):
        user = get_user_model().objects.get(id=user_id)
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
