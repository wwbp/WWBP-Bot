from rest_framework import status
from rest_framework.response import Response
from rest_framework import viewsets, permissions
from rest_framework.authtoken.models import Token
from django.middleware.csrf import get_token
import logging
from .models import User, Task, Module
from .serializers import UserSerializer, TaskSerializer, ModuleSerializer
from django.contrib.auth import get_user_model
import json
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponseNotAllowed, JsonResponse
from datetime import datetime

logger = logging.getLogger(__name__)  # Setup logger


def csrf(request):
    csrf_token = get_token(request)
    return JsonResponse({'csrfToken': csrf_token})


def current_time(request):
    now = datetime.now().isoformat()
    return JsonResponse({'current_time': now})


def login_view(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            token, _ = Token.objects.get_or_create(user=user)
            return JsonResponse({
                "token": token.key,
                "message": "Login successful",
                "user_id": user.id,
                "role": user.role
            }, status=200)
        else:
            return JsonResponse({"message": "Invalid credentials"}, status=401)


def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out"}, status=200)


@login_required
def user_profile(request):
    if request.method == 'GET':
        user_data = {
            "username": request.user.username,
            "email": request.user.email,
            "role": request.user.role,
            "grade": request.user.grade if request.user.role == 'student' else None,
            "preferred_language": request.user.preferred_language if request.user.role == 'student' else None,
        }
        return JsonResponse(user_data, status=200)

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            request.user.username = data.get('username', request.user.username)
            request.user.email = data.get('email', request.user.email)
            if request.user.role == 'student':
                request.user.grade = data.get('grade', request.user.grade)
                request.user.preferred_language = data.get(
                    'preferred_language', request.user.preferred_language)
            request.user.save()
            return JsonResponse({"message": "Profile updated"}, status=200)
        except Exception as e:
            logger.error("Error updating profile", exc_info=True)
            return JsonResponse({"error": str(e)}, status=500)

    return HttpResponseNotAllowed(['GET', 'PUT'])


@csrf_exempt
def register(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            logger.debug(f"Registration data received: {data}")

            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            role = data.get('role', 'student')  # Default role is 'student'

            if not username or not email or not password:
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            user = get_user_model().objects.create_user(
                username=username, email=email, password=password, role=role)
            user.save()

            # Log the user in after registration
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                token, _ = Token.objects.get_or_create(user=user)
                return JsonResponse({
                    'message': 'User created successfully',
                    'token': token.key,
                    'role': role  # Include role in response
                }, status=201)
            else:
                return JsonResponse({'error': 'Authentication failed'}, status=401)

        except Exception as e:
            logger.error("Error during registration", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid HTTP method'}, status=405)


class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'teacher'


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def create(self, request, *args, **kwargs):
        logger.debug(f"Module creation request data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.error(f"Error creating module: {e}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
