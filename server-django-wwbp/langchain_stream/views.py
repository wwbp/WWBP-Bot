import subprocess
import asyncio
import io
import json
import logging
import os
import re
from collections import deque

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps
from django.conf import settings
from django.core.cache import cache
from google.cloud import speech, texttospeech
from langchain_stream.tasks import save_message_to_transcript, get_file_streams, save_usage_stats
from openai import OpenAI
from openai._compat import model_dump

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

MODERATION_THRESHOLD = {
    "sexual": 0.5,
    "harassment": 0.5,
    "hate": 0.5,
    "illicit": 0.5,
    "self-harm": 0.5,
    "violence": 0.5
}


async def moderate_content(text, client):
    try:
        response = client.moderations.create(
            model="omni-moderation-latest",
            input=text,
        )
        result = response.results[0]
        category_scores = response.results[0].category_scores or {}
        category_score_items = model_dump(category_scores)
        if result.flagged:
            for category, score in category_score_items.items():
                if category in MODERATION_THRESHOLD and score > MODERATION_THRESHOLD[category]:
                    return True, category
        return False, None
    except Exception as e:
        logger.error(f"Error during moderation: {e}")
        return True, "moderation_error"


async def convert_audio_to_webm_ffmpeg(audio_data):
    try:
        # Create a BytesIO stream to hold the output
        output_audio = io.BytesIO()

        # Define the ffmpeg command to convert to webm
        command = [
            'ffmpeg', '-y',                        # Overwrite existing file
            '-f', 'webm',                          # Specify input format
            # Read from stdin (input audio_data)
            '-i', 'pipe:0',
            # Output codec (libopus for webm)
            '-acodec', 'libopus',
            # Set bitrate to 64k (default for webm)
            '-b:a', '64k',
            '-f', 'webm',                          # Output format is webm
            # Write to stdout (output_audio)
            'pipe:1'
        ]

        # Run the ffmpeg command, piping the input and output to BytesIO
        process = subprocess.Popen(
            command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        output, error = process.communicate(input=audio_data)

        if process.returncode != 0:
            raise Exception(f"ffmpeg error: {error.decode('utf-8')}")

        # Write the output from ffmpeg into the BytesIO object
        output_audio.write(output)
        output_audio.seek(0)  # Reset buffer pointer to the start

        return output_audio  # Return the BytesIO object containing the webm audio

    except Exception as e:
        print(f"Error converting audio to webm with ffmpeg: {e}")
        return None


def get_cached_data(key, fetch_function, timeout=300):
    data = cache.get(key)
    if data is None:
        data = fetch_function()
        cache.set(key, data, timeout=timeout)
    return data


class PromptHook:
    @sync_to_async
    def get_system_prompt(self):
        def fetch_prompt():
            SystemPrompt = apps.get_model('accounts', 'SystemPrompt')
            try:
                prompt = SystemPrompt.objects.latest('created_at')
                return prompt.prompt
            except SystemPrompt.DoesNotExist:
                return "You are a helpful assistant."
        return get_cached_data('system_prompt', fetch_prompt)

    @sync_to_async
    def get_module_prompts(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = ChatSession.objects.get(id=session_id)
            module = session.module
            return module.content
        except Exception as e:
            logger.error(f"Error fetching module prompts: {e}")

    @sync_to_async
    def get_task_prompts(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = ChatSession.objects.get(id=session_id)
            task = session.task
            return task.content, task.instruction_prompt
        except Exception as e:
            logger.error(f"Error fetching task prompts: {e}")

    @sync_to_async
    def get_persona_prompts(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = ChatSession.objects.get(id=session_id)
            task = session.task
            persona = task.persona
            return persona.name, persona.instructions
        except Exception as e:
            logger.error(f"Error fetching persona prompts: {e}")

    @sync_to_async
    def get_user_profile(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = ChatSession.objects.get(id=session_id)
            user = session.user
            return {
                "username": user.username,
                "preferred_name": user.preferred_name,
                "role": user.role,
                "grade": user.grade,
                "preferred_language": user.preferred_language,
                "voice_speed": user.voice_speed
            }
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")

    async def get_cumulative_setup_instructions(self, session_id):
        try:
            system_prompts = await self.get_system_prompt()
            task_content, task_instruction = await self.get_task_prompts(session_id=session_id)
            persona_name, persona_prompt = await self.get_persona_prompts(session_id=session_id)
            user_profile_details = await self.get_user_profile(session_id=session_id)
            module_content = await self.get_module_prompts(session_id=session_id)
            return f"""
                ### System Guidelines:
                {system_prompts}

                ### Module Content:
                {module_content}

                ### Task Details:
                - **Content**: {task_content}
                - **Instructions**: {task_instruction}

                ### Persona Information:
                - **Name**: {persona_name}
                - **Persona Prompt**: {persona_prompt}

                ### User Profile:
                {user_profile_details}
            """
        except Exception as e:
            logger.error(f"Error creating cumulative setup instructions: {e}")
            return "Error in generating instructions."


class AssistantSessionManager(PromptHook):
    session_counters = {}

    def __init__(self):
        super().__init__()
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        self.thread = None
        self.assistant = None
        self.vector_store = None
        self.run_active = False

    async def get_next_message_id(self, session_id):
        if session_id not in self.session_counters:
            self.session_counters[session_id] = 1
        else:
            self.session_counters[session_id] += 1
        return self.session_counters[session_id]

    async def setup(self, session_id):
        logger.debug(f"Setting up session for session_id={session_id}")
        try:
            self.assistant = await self.get_assistant(session_id=session_id)
            self.thread = await self.get_thread(session_id=session_id)
            if not self.assistant or not self.thread:
                raise Exception("Assistant or thread setup failed")

            try:
                self.vector_store = await self.initialize_vector_store(session_id)
                if self.vector_store:
                    await self.update_assistant_with_vector_store()
            except Exception as e:
                logger.error(f"Error uploading files to vector store: {e}")
                logger.debug("Proceeding without file uploads")
        except Exception as e:
            logger.error(f"Error setting up session manager: {e}")

    async def get_assistant(self, session_id):
        logger.debug(f"Getting assistant for session_id={session_id}")
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = await sync_to_async(ChatSession.objects.get)(id=session_id)
            if session.assistant_id:
                assistant = self.client.beta.assistants.retrieve(
                    session.assistant_id)
                logger.debug(
                    f"Retrieved existing assistant id: {assistant.id}")
                return assistant

            instruction_prompt = await self.get_cumulative_setup_instructions(session_id=session_id)
            logger.debug(
                f"The instruction prompt for session: {session_id} is as follows: {instruction_prompt}")
            assistant = self.client.beta.assistants.create(
                model="gpt-4o-mini",
                instructions=instruction_prompt,
                tools=[{"type": "file_search"}],
            )
            session.assistant_id = assistant.id
            await sync_to_async(session.save)()
            logger.debug(f"Created new assistant: {assistant.id}")
            return assistant
        except Exception as e:
            logger.error(f"Error in get_assistant: {e}")
            return None

    async def get_thread(self, session_id):
        logger.debug(f"Getting thread for session_id={session_id}")
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = await sync_to_async(ChatSession.objects.get)(id=session_id)
            if session.thread_id:
                thread = self.client.beta.threads.retrieve(session.thread_id)
                logger.debug(f"Retrieved existing thread id: {thread.id}")
                return thread

            thread = self.client.beta.threads.create()
            session.thread_id = thread.id
            await sync_to_async(session.save)()
            logger.debug(f"Created new thread: {thread.id}")
            return thread
        except Exception as e:
            logger.error(f"Error in get_thread: {e}")
            return None

    async def create_user_message(self, message):
        logger.debug(f"Creating user message: {message}")
        try:
            self.client.beta.threads.messages.create(
                thread_id=self.thread.id, role="user", content=message
            )
        except Exception as e:
            logger.error(f"Error creating user message: {e}")

    async def get_run_stream(self):
        logger.debug(
            f"Getting run stream for assistant id: {self.assistant.id}")
        while True:
            try:
                stream = self.client.beta.threads.runs.create(
                    assistant_id=self.assistant.id,
                    thread_id=self.thread.id,
                    stream=True
                )
                self.run_active = True
                return stream
            except Exception as e:
                if "active" in str(e):
                    logger.debug(
                        f"Run is already active for session_id={self.session_id}, waiting...")
                    await asyncio.sleep(1)
                else:
                    logger.error(f"Error getting run stream: {e}")
                    return None

    async def async_stream(self, stream):
        logger.debug("Starting async stream")
        try:
            loop = asyncio.get_running_loop()
            for event in stream:
                logger.debug(f"Streaming event: {event}")
                yield await loop.run_in_executor(None, lambda: event)
        except Exception as e:
            logger.error(f"Error in async stream: {e}")

    async def initialize_vector_store(self, session_id):
        try:
            file_streams = await get_file_streams(session_id)
            if file_streams:
                vector_store = self.client.beta.vector_stores.create(
                    name="Educational Content", expires_after={
                        "anchor": "last_active_at",
                        "days": 2
                    }
                )
                logger.debug(f"Created vector store: {vector_store.id}")
                file_batch = self.client.beta.vector_stores.file_batches.upload_and_poll(
                    vector_store_id=vector_store.id, files=file_streams
                )
                logger.debug(
                    f"Uploaded files to vector store: {file_batch.status}")
                return vector_store
            else:
                logger.debug(
                    f"No vector store")
                return None
        except Exception as e:
            logger.error(f"Error creating vector store: {e}")
            return None

    async def update_assistant_with_vector_store(self):
        try:
            if self.vector_store:
                self.client.beta.assistants.update(
                    assistant_id=self.assistant.id,
                    tool_resources={"file_search": {
                        "vector_store_ids": [self.vector_store.id]}},
                )
                logger.debug(
                    f"Updated assistant with vector store: {self.vector_store.id}")
        except Exception as e:
            logger.error(f"Error updating assistant with vector store: {e}")


class BaseWebSocketConsumer(AsyncWebsocketConsumer):
    async def ping(self):
        while True:
            try:
                await self.send(text_data=json.dumps({"type": "ping"}))
                logger.debug("Ping sent")
            except Exception as e:
                logger.error(f"Error in ping: {e}")
                await self.close()
                break
            await asyncio.sleep(30)

    async def connect(self):
        try:
            await self.accept()
            asyncio.create_task(self.ping())
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await self.close()

    async def disconnect(self, close_code):
        await super().disconnect(close_code)


class ChatConsumer(BaseWebSocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f"chat_{self.session_id}"
        self.session_manager = AssistantSessionManager()
        logger.debug(
            f"User attempting to connect to session {self.session_id} in group {self.room_group_name}")

        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )
        logger.debug(
            f"Connected to room group: {self.room_group_name} with channel: {self.channel_name}")

        await self.accept()

        logger.debug(
            f"Attempting WebSocket connection: session_id={self.session_id}")

        try:
            await self.session_manager.setup(session_id=self.session_id)
            if not self.session_manager.assistant or not self.session_manager.thread:
                raise Exception("Assistant or thread setup failed")

            logger.debug(
                f"WebSocket connected: session_id={self.session_id}, assistant_id={self.session_manager.assistant.id}, thread_id={self.session_manager.thread.id}")
            asyncio.create_task(self.ping())

            if not cache.get(f'initial_message_sent_{self.session_id}', False):
                message_id = await self.session_manager.get_next_message_id(self.session_id)
                initial_message = "Begin the conversation."
                await self.session_manager.create_user_message(message=initial_message)
                await self.channel_layer.group_send(self.room_group_name, {"type": "stream_text_response", "message_id": message_id})
                cache.set(f'initial_message_sent_{self.session_id}', True)

        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await self.close()

    async def disconnect(self, close_code):
        await super().disconnect(close_code)

        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )
        logger.debug(
            f"Disconnected from room group: {self.room_group_name} with channel: {self.channel_name}")

        logger.debug(
            f"WebSocket disconnected: session_id={self.session_id}, close_code={close_code}")

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        message_id = await self.session_manager.get_next_message_id(self.session_id)

        logger.debug(
            f"Received message: {message}, from user in session: {self.session_id}")

        # Moderation check for incoming user message
        is_flagged, category = await moderate_content(message, self.session_manager.client)
        if is_flagged:
            # Save user message and respond as blocked
            moderation_response = f"Your message was blocked due to content related to {category}."
            await save_message_to_transcript(
                session_id=self.session_id,
                message_id=str(message_id),
                user_message=message,
                bot_message=moderation_response,
                has_audio=False,
                audio_bytes=None
            )

            # Send events to mimic normal assistant reply
            await self.send(text_data=json.dumps({"event": "on_parser_start", "message_id": message_id}))
            await self.send(text_data=json.dumps({"event": "on_parser_stream", "message_id": message_id, "value": moderation_response}))
            await self.send(text_data=json.dumps({"event": "on_parser_end", "message_id": message_id}))
            return

        try:
            await save_message_to_transcript(session_id=self.session_id, message_id=str(message_id),
                                             user_message=message, bot_message=None, has_audio=False, audio_bytes=None)
            await self.session_manager.create_user_message(message=message)
            await self.channel_layer.group_send(self.room_group_name, {"type": "stream_text_response", "message_id": message_id})
        except Exception as e:
            logger.error(f"Error processing received message: {e}")

    async def stream_text_response(self, event):
        message_id = event["message_id"]
        stream = await self.session_manager.get_run_stream()
        bot_message_buffer = []
        logger.debug(
            f"Streaming text response in session: {self.session_id}, assistant_id={self.session_manager.assistant.id}, thread_id={self.session_manager.thread.id} for message_id={message_id}")
        try:
            async for event in self.session_manager.async_stream(stream):
                chunk = {}
                chunk["message_id"] = message_id
                if event.event == 'thread.run.created':
                    chunk["event"] = "on_parser_start"
                    await self.send(text_data=json.dumps(chunk))
                elif event.event == 'thread.message.delta':
                    value = event.data.delta.content[0].text.value
                    if isinstance(value, bytes):
                        value = value.decode('utf-8', errors='replace')
                    chunk["event"] = "on_parser_stream"
                    chunk["value"] = value
                    await self.send(text_data=json.dumps(chunk))
                    bot_message_buffer.append(value)
                elif event.event == 'thread.run.completed':
                    chunk["event"] = "on_parser_end"
                    await self.send(text_data=json.dumps(chunk))
                    complete_bot_message = ''.join(bot_message_buffer)

                    await save_message_to_transcript(session_id=self.session_id, message_id=message_id,
                                                     user_message=None, bot_message=complete_bot_message, has_audio=False, audio_bytes=None)

                    bot_message_buffer.clear()
                    self.session_manager.run_active = False

                    usage = event.data.usage
                    await save_usage_stats(
                        session_id=self.session_id,
                        prompt_tokens=usage.prompt_tokens,
                        completion_tokens=usage.completion_tokens,
                        total_tokens=usage.total_tokens
                    )

                    logger.debug(
                        f"Completed bot message for session_id={self.session_id}, message_id={message_id}: {complete_bot_message}")
                else:
                    continue
        except Exception as e:
            logger.error(f"Error in chain events: {e}")


class AudioConsumer(BaseWebSocketConsumer):
    audio_queue = deque()
    bot_audio_buffer = []
    bot_message_buffer = []

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f"chat_{self.session_id}"
        self.session_manager = AssistantSessionManager()
        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )
        await self.accept()
        try:
            await self.session_manager.setup(session_id=self.session_id)
            if not self.session_manager.assistant or not self.session_manager.thread:
                raise Exception("Assistant or thread setup failed")

            logger.debug(
                f"Audio WebSocket connected: session_id={self.session_id}")
            asyncio.create_task(self.ping())

            if not cache.get(f'initial_message_sent_{self.session_id}', False):
                message_id = await self.session_manager.get_next_message_id(self.session_id)
                initial_message = "Begin the conversation."
                await self.session_manager.create_user_message(message=initial_message)
                await self.channel_layer.group_send(self.room_group_name, {"type": "stream_audio_response", "message_id": message_id})
                cache.set(f'initial_message_sent_{self.session_id}', True)

        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await self.close()

    async def disconnect(self, close_code):
        await super().disconnect(close_code)

        await self.channel_layer.group_discard(
            self.room_group_name, self.channel_name
        )
        logger.debug(
            f"Disconnected from room group: {self.room_group_name} with channel: {self.channel_name}")

        logger.debug(
            f"WebSocket disconnected: session_id={self.session_id}, close_code={close_code}")

    async def receive(self, bytes_data=None):
        if bytes_data:
            logger.debug(f"Audio data received: {type(bytes_data)}")
            message_id = await self.session_manager.get_next_message_id(self.session_id)

            # transcript = await self.process_audio(bytes_data)
            transcript = await self.stt_openai(bytes_data)

            # Moderation check for incoming user transcript
            is_flagged, category = await moderate_content(transcript, self.session_manager.client)
            if is_flagged:
                moderation_message = f"Your audio message was blocked due to content related to {category}."
                audio_chunk = await self.text_to_speech(self.process_text_for_tts(moderation_message))
                self.audio_queue.append(audio_chunk)
                asyncio.create_task(self.send_audio_chunk())
                await self.send(text_data=json.dumps({"event": "on_parser_start", "message_id": message_id}))
                await self.send(text_data=json.dumps({"event": "on_parser_stream", "message_id": message_id, "value": moderation_message}))
                await self.send(text_data=json.dumps({"event": "on_parser_end", "message_id": message_id}))
                await save_message_to_transcript(
                    session_id=self.session_id,
                    message_id=str(message_id),
                    user_message=transcript,
                    bot_message=moderation_message,
                    has_audio=True,
                    audio_bytes=audio_chunk
                )
                return

            await save_message_to_transcript(session_id=self.session_id, message_id=message_id,
                                             user_message=transcript, bot_message=None, has_audio=True, audio_bytes=bytes_data)
            if transcript:
                await self.session_manager.create_user_message(message=transcript)
                await self.send(text_data=json.dumps({"transcript": transcript, "message_id": message_id}))
                await self.channel_layer.group_send(self.room_group_name, {"type": "stream_audio_response", "message_id": message_id})

            else:
                moderation_message = "Sorry, I was unable to hear that."
                audio_chunk = await self.text_to_speech(self.process_text_for_tts(moderation_message))
                self.audio_queue.append(audio_chunk)
                asyncio.create_task(self.send_audio_chunk())

    async def process_audio(self, audio_data):
        logger.debug(f"Audio data size: {len(audio_data)} bytes")
        client = speech.SpeechClient()
        audio = speech.RecognitionAudio(content=audio_data)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code=settings.STT_LANGUAGE_CODE,
        )
        try:
            response = client.recognize(config=config, audio=audio)
            if not response.results:
                logger.error("No results from speech recognition")
                return ""
            transcript = response.results[0].alternatives[0].transcript
            return transcript
        except Exception as e:
            logger.error(f"Error during speech recognition: {e}")
            return ""

    async def stt_openai(self, audio_data):
        logger.debug(f"Audio data size: {len(audio_data)} bytes")

        # Convert the audio using ffmpeg
        webm_audio = await convert_audio_to_webm_ffmpeg(audio_data)

        if not webm_audio:
            logger.error("Audio conversion to webm failed.")
            return ""

        # Reset the buffer pointer to the start before sending to Whisper
        webm_audio.seek(0)
        logger.debug(f"Type of audio_data: {type(webm_audio)}")

        try:
            client = OpenAI()  # Assuming you've instantiated OpenAI client earlier

            # Pass the BytesIO object with explicit filename and MIME type
            response = client.audio.translations.create(
                model="whisper-1",
                # Specify filename and MIME type
                file=("audio.webm", webm_audio, "audio/webm"),
            )

            if not response.text:
                logger.error("No results from speech recognition")
                return ""

            transcript = response.text
            return transcript

        except Exception as e:
            logger.error(f"Error during speech recognition: {e}")
            return ""

    async def stream_audio_response(self, event):
        message_id = event["message_id"]
        stream = await self.session_manager.get_run_stream()
        try:
            buffer = []
            async for event in self.session_manager.async_stream(stream):
                chunk = {}
                chunk["message_id"] = message_id
                if event.event == 'thread.run.created':
                    chunk["event"] = "on_parser_start"
                    await self.send(text_data=json.dumps(chunk))
                elif event.event == 'thread.message.delta':
                    value = event.data.delta.content[0].text.value
                    if isinstance(value, bytes):
                        value = value.decode('utf-8', errors='replace')
                    chunk["event"] = "on_parser_stream"
                    chunk["value"] = value
                    logger.debug(f"Received chunk: {chunk['value']}")
                    if value.startswith(" "):
                        buffer.append(value)
                    else:
                        if buffer:
                            buffer[-1] = buffer[-1] + value
                        else:
                            buffer.append(value)
                    self.bot_message_buffer.append(value)
                    await self.send(text_data=json.dumps(chunk))

                    logger.debug(f"Current buffer: {' '.join(buffer)}")

                    if any(p in buffer[-1] for p in ['.', '!', '?', ';', ',']):
                        batched_text = ' '.join(buffer)
                        logger.debug(
                            f"Buffer converted to audio: {batched_text}")
                        buffer = []
                        processed_text = self.process_text_for_tts(
                            batched_text)
                        audio_chunk = await self.text_to_speech(processed_text)

                        self.bot_audio_buffer.append(audio_chunk)
                        self.audio_queue.append(audio_chunk)
                        asyncio.create_task(self.send_audio_chunk())
                        logger.debug(
                            f"Audio chunk queued: {len(audio_chunk)} bytes")
                elif event.event == 'thread.run.completed':
                    if buffer:
                        batched_text = ' '.join(buffer)
                        logger.debug(
                            f"Final buffer converted to audio: {batched_text}")
                        processed_text = self.process_text_for_tts(
                            batched_text)

                        audio_chunk = await self.text_to_speech(processed_text)
                        self.bot_audio_buffer.append(audio_chunk)
                        self.audio_queue.append(audio_chunk)
                        asyncio.create_task(self.send_audio_chunk())
                    await self.send(text_data=json.dumps({'event': 'on_parser_end'}))
                    complete_bot_message = ''.join(self.bot_message_buffer)
                    complete_audio = b''.join(self.bot_audio_buffer)
                    logger.debug(
                        f"Total bot message: {complete_bot_message}")
                    await save_message_to_transcript(session_id=self.session_id, message_id=message_id,
                                                     user_message=None, bot_message=complete_bot_message, has_audio=True, audio_bytes=complete_audio)

                    self.bot_message_buffer.clear()
                    self.bot_audio_buffer.clear()
                    self.session_manager.run_active = False
                    usage = event.data.usage
                    await save_usage_stats(
                        session_id=self.session_id,
                        prompt_tokens=usage.prompt_tokens,
                        completion_tokens=usage.completion_tokens,
                        total_tokens=usage.total_tokens
                    )
                else:
                    logger.error(
                        f"Unknown 'chunk' event: {chunk.get('event', 'no event')}")
        except Exception as e:
            logger.error(f"Error in chain events: {e}")

    async def send_audio_chunk(self, audio_chunk=None):
        if audio_chunk:
            self.audio_queue.append(audio_chunk)
        while self.audio_queue:
            audio_chunk = self.audio_queue.popleft()
            await self.send(bytes_data=audio_chunk)

    def process_text_for_tts(self, text):
        text = re.sub(r'[,.!?;*#]', '', text)
        return text

    async def fetch_voice_speed(self):
        cache_key = f"voice_speed_{self.session_id}"
        voice_speed = cache.get(cache_key)

        if voice_speed is None:
            logger.debug(
                f"Fetching voice speed for session_id={self.session_id}")
            user_profile = await self.session_manager.get_user_profile(self.session_id)
            voice_speed = float(user_profile['voice_speed'])
            cache.set(cache_key, voice_speed, timeout=3600)
        else:
            logger.debug(f"Using cached voice speed: {voice_speed}")

        return voice_speed

    async def text_to_speech(self, text):
        client = texttospeech.TextToSpeechClient()
        ssml_text = f"<speak>{text}</speak>"
        input_text = texttospeech.SynthesisInput(ssml=ssml_text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Standard-F",
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE,
        )
        voice_speed = 1.0
        voice_speed = await self.fetch_voice_speed()

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=voice_speed if voice_speed else 1.0,
            pitch=0.0,
        )
        try:
            response = client.synthesize_speech(
                input=input_text, voice=voice, audio_config=audio_config)
            return response.audio_content
        except Exception as e:
            logger.error(f"Error during text-to-speech synthesis: {e}")
            return b""
