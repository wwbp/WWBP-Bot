from rest_framework.authtoken.models import Token
from django.middleware.csrf import get_token
import logging
from .models import User
from django.contrib.auth import get_user_model
import json
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
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
            return JsonResponse({"token": token.key, "message": "Login successful", "user_id": user.id}, status=200)
        else:
            return JsonResponse({"message": "Invalid credentials"}, status=401)


def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Logged out"}, status=200)


@login_required
def user_profile(request):
    if request.method == 'GET':
        return JsonResponse({"username": request.user.username, "email": request.user.email}, status=200)

    elif request.method == 'PUT':
        # Assuming JSON payload with 'username' and 'email'
        request.user.username = request.json.get(
            'username', request.user.username)
        request.user.email = request.json.get('email', request.user.email)
        request.user.save()
        return JsonResponse({"message": "Profile updated"}, status=200)


@csrf_exempt
def register(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Log the received data
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
            return JsonResponse({'message': 'User created successfully'}, status=201)

        except Exception as e:
            # Log the exception with traceback
            logger.error("Error during registration", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid HTTP method'}, status=405)
