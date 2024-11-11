import re
from django.db import transaction
from django.core.paginator import Paginator
from django.utils.decorators import method_decorator
import zipfile
import io
from rest_framework import status
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
from django.http import Http404, HttpResponseNotAllowed, JsonResponse, HttpResponse, FileResponse, HttpResponseRedirect
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

from .models import Persona, User, Task, Module, ChatSession, SystemPrompt, UserCSVDownload
from .serializers import PersonaSerializer, UserSerializer, TaskSerializer, ModuleSerializer, ChatSessionSerializer, SystemPromptSerializer


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
            "voice_speed": request.user.voice_speed,
            "interaction_mode": request.user.interaction_mode,
            "grade": request.user.grade if request.user.role == 'student' else None,
            "preferred_language": request.user.preferred_language if request.user.role == 'student' else None,
            "preferred_name": request.user.preferred_name
        }
        return JsonResponse(user_data, status=200)

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            request.user.username = data.get('username', request.user.username)
            request.user.email = data.get('email', request.user.email)
            request.user.interaction_mode = data.get(
                'interaction_mode', request.user.interaction_mode)

            if request.user.role == 'student':
                request.user.grade = data.get('grade', request.user.grade)
                request.user.preferred_language = data.get(
                    'preferred_language', request.user.preferred_language)
            request.user.voice_speed = data.get(
                'voice_speed', request.user.voice_speed)
            request.user.preferred_name = data.get(
                'preferred_name', request.user.preferred_name)

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
            username = data.get('username')
            password = data.get('password')
            role = data.get('role', 'student')
            preferred_name = data.get('preferred_name', username)
            auth_password = data.get('authPassword')

            if role in ['teacher', 'admin']:
                expected_auth_password = settings.AUTHENTICATION_PASSWORD
                if auth_password != expected_auth_password:
                    return JsonResponse({"error": "Invalid authentication password"}, status=403)

            if not username or not password:
                return JsonResponse({'error': 'Missing required fields'}, status=400)

            user = get_user_model().objects.create_user(
                username=username, password=password, role=role, preferred_name=preferred_name)
            user.save()

            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                token, _ = Token.objects.get_or_create(user=user)
                return JsonResponse({
                    'message': 'User created successfully',
                    'token': token.key,
                    'role': role
                }, status=201)
            else:
                return JsonResponse({'error': 'Authentication failed'}, status=401)

        except Exception as e:
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
    queryset = Module.objects.filter(is_deleted=False)
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        tasks = module.tasks.all().filter(is_deleted=False)
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeacher])
    def duplicate(self, request, pk=None):
        try:
            original_module = self.get_object()
            new_module_name = f"{original_module.name} [duplicate]"

            # Handle multiple duplicates
            existing_duplicates = Module.objects.filter(
                name__startswith=new_module_name
            ).count()
            if existing_duplicates > 0:
                new_module_name = f"{new_module_name} ({existing_duplicates + 1})"

            # Create a new module with the same content
            new_module = Module.objects.create(
                name=new_module_name,
                created_by=request.user,
                content=original_module.content,
                files=original_module.files,
            )

            # Duplicate the tasks
            for task in original_module.tasks.all():
                Task.objects.create(
                    title=task.title,
                    content=task.content,
                    module=new_module,
                    instruction_prompt=task.instruction_prompt,
                    persona_prompt=task.persona_prompt,
                    files=task.files,
                )

            serializer = self.get_serializer(new_module)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error duplicating module: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer
    permission_classes = [permissions.IsAuthenticated]


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.filter(is_deleted=False)
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsTeacher])
    def duplicate(self, request, pk=None):
        try:
            original_task = self.get_object()
            new_task_title = f"{original_task.title} [duplicate]"

            # Handle multiple duplicates
            existing_duplicates = Task.objects.filter(
                title__startswith=new_task_title,
                module=original_task.module
            ).count()
            if existing_duplicates > 0:
                new_task_title = f"{new_task_title} ({existing_duplicates + 1})"

            # Create a new task with the same content
            new_task = Task.objects.create(
                title=new_task_title,
                content=original_task.content,
                module=original_task.module,
                instruction_prompt=original_task.instruction_prompt,
                persona_prompt=original_task.persona_prompt,
                files=original_task.files,
            )

            serializer = self.get_serializer(new_task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error duplicating task: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


class SystemPromptViewSet(viewsets.ModelViewSet):
    queryset = SystemPrompt.objects.all()
    serializer_class = SystemPromptSerializer
    permission_classes = [IsAuthenticated]


class GeneratePresignedURL(APIView):
    @csrf_exempt
    def post(self, request):
        try:
            file_name = request.data.get('file_name')
            file_name = re.sub(r'[^a-zA-Z0-9._-]', '', file_name)
            file_type = request.data.get('file_type')

            if not file_name or not file_type:
                return Response({"error": "File name and type are required."}, status=400)

            if settings.ENVIRONMENT == 'local':
                # Different directories for avatars and other files
                upload_dir = 'data/upload/'
                file_path = os.path.join(
                    settings.BASE_DIR, upload_dir, file_name)
                return Response({
                    "url": "local",
                    "file_path": file_path
                })

            s3_client = boto3.client(
                's3', region_name=settings.AWS_S3_REGION_NAME)
            # Correct paths for avatars and other files
            upload_key = f"data/upload/{file_name}"

            presigned_post = s3_client.generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=upload_key,
                Fields={"Content-Type": file_type},
                Conditions=[{"Content-Type": file_type}],
                ExpiresIn=3600
            )
            return Response(presigned_post)

        except Exception as e:
            logger.error(f"Error generating presigned URL: {e}")
            return Response({"error": str(e)}, status=500)


class LocalFileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def sanitize_filename(self, filename):
        filename = os.path.basename(filename)  # Ensure no path traversal
        filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
        return filename

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        sanitized_filename = self.sanitize_filename(file.name)

        is_avatar = request.data.get('is_avatar', False)

        try:
            if is_avatar:
                local_upload_dir = os.path.join(
                    settings.MEDIA_ROOT, 'avatars/')
            else:
                local_upload_dir = os.path.join(settings.MEDIA_ROOT, 'upload/')

            os.makedirs(local_upload_dir, exist_ok=True)

            file_path = os.path.join(local_upload_dir, sanitized_filename)
            with open(file_path, 'wb') as f:
                for chunk in file.chunks():
                    f.write(chunk)

            file_url = f"{settings.MEDIA_URL}avatars/{sanitized_filename}" if is_avatar else f"{settings.MEDIA_URL}upload/{sanitized_filename}"

        except Exception as e:
            logger.error(f"Error saving the file: {e}")
            return Response({"detail": f"Error saving the file: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'file_path': file_url}, status=status.HTTP_201_CREATED)

    def get(self, request, *args, **kwargs):
        # Sanitize the filename
        filename = request.GET.get('file_name')
        logger.debug(f"Request for file: {filename}")
        sanitized_filename = filename

        # Check if the file is an avatar
        # Ensure consistent directory lookup
        is_avatar = request.GET.get('is_avatar', False)

        # Use the correct directory
        if is_avatar:
            local_upload_dir = os.path.join(settings.BASE_DIR, 'data/avatars/')
        else:
            local_upload_dir = os.path.join(settings.BASE_DIR, 'data/upload/')

        file_path = os.path.join(local_upload_dir, sanitized_filename)

        # Check if the file exists and return it, otherwise raise 404
        if os.path.exists(file_path):
            # Adjust content_type as needed
            return FileResponse(open(file_path, 'rb'), content_type='application/octet-stream')
        else:
            raise Http404("File not found")


class CSVCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @method_decorator(csrf_exempt)
    def post(self, request):
        module_id = request.data.get('module_id')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        user_id = request.user.id

        logger.info(
            f"Starting CSV creation request for module {module_id} from {start_date} to {end_date} for user {user_id}")

        try:
            self.create_csv_and_upload_to_s3(
                module_id, start_date, end_date, user_id)
            return JsonResponse({'message': 'CSV creation started. You will be notified when it is ready.'})
        except Exception as e:
            logger.error(f"Failed to start CSV creation: {e}")
            return JsonResponse({'error': 'Failed to start CSV creation.'}, status=500)

    def create_csv_and_upload_to_s3(self, module_id, start_date, end_date, user_id):
        try:
            etc = pytz.timezone('US/Eastern')
            start_date_etc = etc.localize(
                datetime.strptime(start_date, '%Y-%m-%d'))
            end_date_etc = etc.localize(datetime.strptime(
                end_date, '%Y-%m-%d')) + timedelta(days=1)
            start_date_utc = start_date_etc.astimezone(pytz.utc)
            end_date_utc = end_date_etc.astimezone(pytz.utc)

            Transcript = apps.get_model('langchain_stream', 'Transcript')
            user_conversations = Transcript.objects.filter(
                session__module_id=module_id,
                created_at__range=(start_date_utc, end_date_utc)
            ).select_related('session__user', 'session__task', 'session__module').iterator(chunk_size=1000)

            logger.debug("Fetched conversations for CSV creation")

            zip_buffer = io.BytesIO()

            with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
                buffer = io.StringIO()
                writer = csv.writer(buffer)
                writer.writerow(['Session ID', 'Username', 'Module Name', 'Task Name', 'Message ID',
                                'User Message', 'Bot Message', 'Created At (UTC)', 'Has Audio', 'Audio Link'])

                count = 0
                for conversation in user_conversations:
                    writer.writerow([
                        conversation.session.id,
                        conversation.session.user.username,
                        conversation.session.module.name if conversation.session.module else '',
                        conversation.session.task.title if conversation.session.task else '',
                        conversation.message_id,
                        conversation.user_message,
                        conversation.bot_message,
                        conversation.created_at,
                        conversation.has_audio,
                        conversation.audio_link
                    ])
                    count += 1

                    if count % 1000 == 0:
                        file_name = f"transcript_module_{module_id}_{start_date}_to_{end_date}_batch_{count // 1000}.csv"
                        zip_file.writestr(file_name, buffer.getvalue())
                        buffer = io.StringIO()
                        writer = csv.writer(buffer)
                        writer.writerow(['Session ID', 'Username', 'Module Name', 'Task Name', 'Message ID',
                                        'User Message', 'Bot Message', 'Created At (UTC)', 'Has Audio', 'Audio Link'])

                # Write any remaining data
                if count % 1000 != 0:
                    file_name = f"transcript_module_{module_id}_{start_date}_to_{end_date}_batch_{count // 1000 + 1}.csv"
                    zip_file.writestr(file_name, buffer.getvalue())

            zip_buffer.seek(0)

            zip_file_name = f"transcripts_module_{module_id}_{start_date}_to_{end_date}.zip"
            if settings.ENVIRONMENT == 'local':
                local_dir = os.path.join(settings.BASE_DIR, 'data/transcript')
                os.makedirs(local_dir, exist_ok=True)
                file_path = os.path.join(local_dir, zip_file_name)
                with open(file_path, 'wb') as f:
                    f.write(zip_buffer.getvalue())
                file_url = file_path
                logger.info(f"ZIP file saved locally at {file_path}")
            else:
                s3 = boto3.client(
                    's3', region_name=settings.AWS_S3_REGION_NAME)
                s3_key = f"data/transcript/{zip_file_name}"
                s3.put_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                              Key=s3_key, Body=zip_buffer.getvalue())
                file_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
                logger.info(f"ZIP file uploaded to S3 at {file_url}")

            with transaction.atomic():
                UserCSVDownload.objects.create(
                    user_id=user_id,
                    module_id=module_id,
                    start_date=start_date,
                    end_date=end_date,
                    file_url=file_url,
                    is_deleted=False
                )
                logger.info(
                    f"ZIP file details saved in database for user {user_id}")

        except pytz.exceptions.UnknownTimeZoneError as tz_error:
            logger.error(f"Timezone error: {tz_error}")
            raise
        except boto3.exceptions.Boto3Error as s3_error:
            logger.error(f"S3 error: {s3_error}")
            raise
        except Exception as e:
            logger.error(f"Error creating and uploading ZIP: {e}")
            raise


class CSVListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        csv_files = UserCSVDownload.objects.filter(
            user_id=user_id, is_deleted=False).order_by('-created_at')
        csv_list = [{'id': csv.id, 'module_id': csv.module.id, 'module_name': csv.module.name, 'start_date': csv.start_date,
                     'end_date': csv.end_date, 'file_url': csv.file_url} for csv in csv_files]
        logger.info(f"Fetched CSV list for user {user_id}: {csv_list}")
        return Response(csv_list, status=status.HTTP_200_OK)

    def delete(self, request, csv_id):
        user_id = request.user.id
        try:
            csv_file = UserCSVDownload.objects.get(id=csv_id, user_id=user_id)
            csv_file.is_deleted = True
            csv_file.save()
            logger.info(
                f"CSV file {csv_id} marked as deleted for user {user_id}")
            return Response({'message': 'CSV file deleted successfully.'}, status=status.HTTP_200_OK)
        except UserCSVDownload.DoesNotExist:
            logger.error(f"CSV file {csv_id} not found for user {user_id}")
            return Response({'error': 'CSV file not found.'}, status=status.HTTP_404_NOT_FOUND)


class CSVServeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, csv_id):
        logger.info(f"Serving CSV with id {csv_id} for user {request.user.id}")
        csv_record = UserCSVDownload.objects.filter(
            id=csv_id, user_id=request.user.id).first()
        if not csv_record:
            logger.error(
                f"CSV file with id {csv_id} not found for user {request.user.id}")
            return HttpResponse(status=404)

        if settings.ENVIRONMENT == 'local':
            file_name = csv_record.file_url.split('/')[-1]
            file_path = os.path.join(
                settings.BASE_DIR, 'data/transcript', file_name)
            logger.debug(f"Local file path: {file_path}")
            if os.path.exists(file_path):
                response = FileResponse(
                    open(file_path, 'rb'), content_type="application/zip")
                response['Content-Disposition'] = f'attachment; filename={file_name}'
                logger.info(
                    f"Serving local ZIP file {file_name} to user {request.user.id}")
                return response
            logger.error(
                f"Local ZIP file {file_name} not found for user {request.user.id}")
            return HttpResponse(status=404)
        else:
            try:
                s3_client = boto3.client(
                    's3', region_name=settings.AWS_S3_REGION_NAME)
                key = csv_record.file_url.split('.com/')[-1]
                signed_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': key},
                    ExpiresIn=3600  # URL expires in 1 hour
                )
                logger.info(
                    f"Generated signed URL for ZIP file {csv_record.file_url}")
                return HttpResponseRedirect(signed_url)
            except Exception as e:
                logger.error(f"Error generating presigned URL: {e}")
                return HttpResponse(status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    try:
        file_name = request.data.get('file_name')
        file_name = re.sub(r'[^a-zA-Z0-9._-]', '', file_name)
        file_type = request.data.get('file_type')

        if not file_name or not file_type:
            return Response({"error": "File name and type are required."}, status=400)

        if settings.ENVIRONMENT == 'local':
            local_upload_dir = os.path.join(settings.MEDIA_ROOT, 'avatars/')
            os.makedirs(local_upload_dir, exist_ok=True)
            # file_path = os.path.join(local_upload_dir, file_name)

            return Response({
                "url": "local",
                # Return URL, not file path
                "file_path": f"{settings.MEDIA_URL}avatars/{file_name}"
            })

        # For production (using S3)
        s3_client = boto3.client('s3', region_name=settings.AWS_S3_REGION_NAME)
        presigned_post = s3_client.generate_presigned_post(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            # Make sure the avatar goes to the correct folder
            Key=f"data/avatars/{file_name}",
            Fields={"Content-Type": file_type},
            Conditions=[{"Content-Type": file_type}],
            ExpiresIn=3600  # 1 hour expiration
        )

        return Response(presigned_post)

    except Exception as e:
        logger.error(f"Error generating presigned URL for avatar: {e}")
        return Response({"error": str(e)}, status=500)
