import io
from rest_framework import status
from django.utils import timezone
from django.http import StreamingHttpResponse
import boto3
import os
import json
import csv
import logging
from datetime import datetime, timedelta
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseNotAllowed, JsonResponse, HttpResponse
from django.apps import apps

from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.views import exception_handler
import openai
import pytz

from .models import User, Task, Module, ChatSession, ChatMessage, SystemPrompt
from .serializers import UserSerializer, TaskSerializer, ModuleSerializer, ChatSessionSerializer, ChatMessageSerializer, SystemPromptSerializer


logger = logging.getLogger(__name__)


def csrf(request):
    csrf_token = get_token(request)
    return JsonResponse({'csrfToken': csrf_token})


def current_time(request):
    now = datetime.now().isoformat()
    return JsonResponse({'current_time': now})


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        logger.error(f"Exception: {exc} Context: {context}")
    return response


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
            logger.error(f"Invalid login attempt for username: {username}")
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


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def switch_to_student_view(request):
    if request.user.is_authenticated and request.user.role == 'teacher':
        request.session['student_view'] = True
        return Response({"message": "Switched to student view"}, status=status.HTTP_200_OK)
    return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def switch_to_teacher_view(request):
    if request.user.is_authenticated and request.user.role == 'teacher':
        request.session['student_view'] = False
        return Response({"message": "Switched to teacher view"}, status=status.HTTP_200_OK)
    return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def get_view_mode(request):
    if request.user.is_authenticated:
        student_view = request.session.get('student_view', False)
        return Response({"student_view": student_view}, status=status.HTTP_200_OK)
    return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def tasks(self, request, pk=None):
        module = self.get_object()
        tasks = module.tasks.all()
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_task(self, request, pk=None):
        module = self.get_object()
        data = request.data.copy()
        data['module'] = module.id
        serializer = TaskSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(module=module)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        module_id = data.get('module')
        if not module_id:
            return Response({"detail": "Module is required."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))


def generate_gpt_response(user_message):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": user_message}
        ]
    )
    return response.choices[0].message.content


class ChatSessionViewSet(viewsets.ModelViewSet):
    queryset = ChatSession.objects.all()
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data
        data['user'] = request.user.id
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def messages(self, request, pk=None):
        session = self.get_object()
        messages = ChatMessage.objects.filter(session=session)
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)


class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        data = request.data
        data['user'] = request.user.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        response_text = generate_gpt_response(data['message'])

        bot_response = ChatMessage.objects.create(
            session_id=data['session'],
            message=response_text,
            sender='bot'
        )
        bot_serializer = self.get_serializer(bot_response)

        return Response({
            'user_message': serializer.data,
            'bot_message': bot_serializer.data
        }, status=status.HTTP_201_CREATED)


class SystemPromptViewSet(viewsets.ModelViewSet):
    queryset = SystemPrompt.objects.all()
    serializer_class = SystemPromptSerializer
    permission_classes = [IsAuthenticated]


class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        allowed_mime_types = [
            "text/x-c", "text/x-csharp", "text/x-c++", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/html", "text/x-java", "application/json", "text/markdown",
            "application/pdf", "text/x-php",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/x-python", "text/x-script.python", "text/x-ruby",
            "text/x-tex", "text/plain", "text/css", "text/javascript",
            "application/x-sh", "application/typescript"
        ]
        if file.content_type not in allowed_mime_types:
            return Response({"detail": "Unsupported file type."}, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

        try:
            if settings.ENVIRONMENT == 'local':
                local_upload_dir = os.path.join(
                    settings.BASE_DIR, 'data/upload/')
                os.makedirs(local_upload_dir, exist_ok=True)
                file_path = default_storage.save(
                    local_upload_dir + file.name, ContentFile(file.read()))
            else:
                s3 = boto3.client(
                    's3', region_name=settings.AWS_S3_REGION_NAME)
                bucket_name = settings.AWS_STORAGE_BUCKET_NAME
                s3_key = f"data/upload/{file.name}"
                s3.upload_fileobj(file, bucket_name, s3_key)
                file_path = f"https://{bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
        except Exception as e:
            logger.error(f"Error saving the file: {e}")

        return Response({'file_path': file_path}, status=status.HTTP_201_CREATED)


class TranscriptDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, module_id, start_date, end_date):
        try:
            # Convert start and end dates from ETC to UTC
            etc = pytz.timezone('US/Eastern')
            start_date_etc = etc.localize(
                datetime.strptime(start_date, '%Y-%m-%d'))
            end_date_etc = etc.localize(datetime.strptime(
                end_date, '%Y-%m-%d')) + timedelta(days=1)
            start_date_utc = start_date_etc.astimezone(pytz.utc)
            end_date_utc = end_date_etc.astimezone(pytz.utc)

            # Query to get all user conversations for a module in a given period
            Transcript = apps.get_model('langchain_stream', 'Transcript')
            user_conversations = Transcript.objects.filter(
                session__module_id=module_id,
                created_at__range=(start_date_utc, end_date_utc)
            ).select_related('session__user', 'session__task', 'session__module')

            # Use StreamingHttpResponse for large datasets
            def transcript_generator(conversations):
                buffer = io.StringIO()
                writer = csv.writer(buffer)
                writer.writerow(['Session ID', 'Username', 'Module Name', 'Task Name',
                                'User Message', 'Bot Message', 'Created At (UTC)', 'Has Audio', 'Audio Link'])
                yield buffer.getvalue()
                buffer.seek(0)
                buffer.truncate(0)
                for conversation in conversations:
                    writer.writerow([
                        conversation.session.id,
                        conversation.session.user.username,
                        conversation.session.module.name if conversation.session.module else '',
                        conversation.session.task.title if conversation.session.task else '',
                        conversation.user_message,
                        conversation.bot_message,
                        conversation.created_at,
                        conversation.has_audio,
                        conversation.audio_link
                    ])
                    yield buffer.getvalue()
                    buffer.seek(0)
                    buffer.truncate(0)

            response = StreamingHttpResponse(transcript_generator(
                user_conversations), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="transcript_module_{module_id}_{start_date}_to_{end_date}.csv"'
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
