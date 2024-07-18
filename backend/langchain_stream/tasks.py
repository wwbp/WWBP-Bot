import boto3
import os
import io
import csv
from django.conf import settings
from django.apps import apps
from asgiref.sync import sync_to_async
import logging
from datetime import datetime
from django.utils import timezone

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


@sync_to_async
def get_file_streams(session_id):
    file_streams = []
    try:
        ChatSession = apps.get_model('accounts', 'ChatSession')
        session = ChatSession.objects.get(id=session_id)
        module = session.module
        task = session.task

        file_paths = module.files if module else []
        if task:
            file_paths += task.files

        for file_path in file_paths:
            if file_path.startswith('s3://'):
                # Download file from S3
                key = file_path[5:].split('/', 1)[-1]
                s3 = boto3.client(
                    's3', region_name=settings.AWS_S3_REGION_NAME)
                bucket_name = settings.AWS_STORAGE_BUCKET_NAME
                logger.debug(f"bucket name: {bucket_name}")
                s3.download_file(
                    bucket_name, key, '/tmp/' + key.split('/')[-1])
                file_streams.append(open('/tmp/' + key.split('/')[-1], 'rb'))
            else:
                # Local file
                file_streams.append(open(file_path, 'rb'))
    except Exception as e:
        logger.error(f"Error retrieving file streams: {e}")
        return []

    return file_streams


@sync_to_async
def save_message_to_transcript(session_id, message_id, user_message, bot_message, has_audio=False, audio_bytes=None):
    try:
        ChatSession = apps.get_model('accounts', 'ChatSession')
        Transcript = apps.get_model('langchain_stream', 'Transcript')
        session = ChatSession.objects.get(id=session_id)
        transcript = Transcript.objects.create(
            session=session,
            message_id=message_id,
            user_message=user_message,
            bot_message=bot_message,
        )

        audio_file_name = f"audio_{session_id}_{message_id}.webm"
        if has_audio and audio_bytes:
            if settings.ENVIRONMENT == 'local':
                local_audio_dir = os.path.join(settings.BASE_DIR, 'data/audio')
                os.makedirs(local_audio_dir, exist_ok=True)
                audio_file_path = os.path.join(
                    local_audio_dir, audio_file_name)
                with open(audio_file_path, "wb") as audio_file:
                    audio_file.write(audio_bytes)
                transcript.has_audio = True
                transcript.audio_link = audio_file_path
            elif settings.ENVIRONMENT == 'production':
                s3 = boto3.client(
                    's3', region_name=settings.AWS_S3_REGION_NAME)
                bucket_name = settings.AWS_STORAGE_BUCKET_NAME
                s3_key = f"data/audio/{audio_file_name}"
                s3.upload_fileobj(io.BytesIO(audio_bytes), bucket_name, s3_key)
                transcript.has_audio = True
                transcript.audio_link = f"https://{bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
            else:
                pass

            transcript.save()
            logger.info(
                f"Transcript saved successfully for session_id: {session_id}, message_id: {message_id}")
    except Exception as e:
        logger.error(f"Error saving transcript: {e}")


def generate_and_upload_csv(module_id, date):
    try:
        # Calculate the start and end of the day
        start_of_day = timezone.make_aware(
            datetime.combine(date, datetime.min.time()))
        end_of_day = timezone.make_aware(
            datetime.combine(date, datetime.max.time()))

        # Query to get all user conversations for a module in a given day
        ChatSession = apps.get_model('accounts', 'ChatSession')
        Transcript = apps.get_model('langchain_stream', 'Transcript')
        user_conversations = Transcript.objects.filter(
            session__module_id=module_id,
            created_at__range=(start_of_day, end_of_day)
        ).select_related('session__user', 'session__task', 'session__module')

        # Define the CSV file path
        csv_file_name = f"user_conversations_module_{module_id}_{date.strftime('%Y_%m_%d')}.csv"
        csv_file_path = f"/tmp/{csv_file_name}"

        # Write the conversations to a CSV file
        with open(csv_file_path, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['Session ID', 'Username', 'Module Name', 'Task Name',
                            'User Message', 'Bot Message', 'Created At', 'Has Audio', 'Audio Link'])

            for conversation in user_conversations:
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

        # Upload CSV to S3
        s3 = boto3.client('s3', region_name=settings.AWS_S3_REGION_NAME)
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        s3_key = f"data/transcript/{csv_file_name}"
        s3.upload_file(csv_file_path, bucket_name, s3_key)
        logger.info(f"CSV file uploaded to S3: {s3_key}")

    except Exception as e:
        logger.error(f"Error generating and uploading CSV: {e}")
