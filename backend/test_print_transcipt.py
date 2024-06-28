from django.apps import apps

Transcript = apps.get_model('langchain_stream', 'Transcript')

# Fetch all transcripts
transcripts = Transcript.objects.all()

# Print each transcript
for transcript in transcripts:
    print(f"Session ID: {transcript.session_id}")
    print(f"Message ID: {transcript.message_id}")
    print(f"User Message: {transcript.user_message}")
    print(f"Bot Message: {transcript.bot_message}")
    print(f"Has Audio: {transcript.has_audio}")
    print(f"Audio Link: {transcript.audio_link}")
    print(f"Created At: {transcript.created_at}")
    print("="*40)
