import os
import django
from django.conf import settings

# Set the environment variable for the settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django
django.setup()

from langchain_stream.tasks import save_message_to_transcript

# Replace these values with actual ones from your database
session_id = 1
message_id = "test_message"
user_message = "This is a test user message."
bot_message = "This is a test bot message."
audio_bytes = b"test audio bytes"

# Call the function
save_message_to_transcript(session_id, message_id, user_message, bot_message, has_audio=True, audio_bytes=audio_bytes)
