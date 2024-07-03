from django.core.cache import cache
import asyncio
import json
import os
import logging
from collections import deque
from channels.generic.websocket import AsyncWebsocketConsumer
from google.cloud import speech, texttospeech
import re
from asgiref.sync import sync_to_async
from langchain_stream.tasks import save_message_to_transcript
from django.apps import apps
from openai import OpenAI

logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')

if ENVIRONMENT == 'production':
    REDIS_URL = f'rediss://{REDIS_HOST}:{REDIS_PORT}'
else:
    REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}'


class PromptHook:

    @sync_to_async
    def get_system_prompt(self):
        SystemPrompt = apps.get_model('accounts', 'SystemPrompt')
        try:
            prompt = SystemPrompt.objects.latest('created_at')
            return prompt.prompt
        except SystemPrompt.DoesNotExist:
            return "You are a helpful assistant."

    @sync_to_async
    def get_task_prompts(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = ChatSession.objects.get(id=session_id)
            task = session.task
            return task.content, task.instruction_prompt, task.persona_prompt
        except Exception as e:
            logger.error(f"failed due to {e}")

    @sync_to_async
    def get_user_profile(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        session = ChatSession.objects.get(id=session_id)
        user = session.user
        profile_info = {
            "username": user.username,
            "role": user.role,
            "grade": user.grade,
            "preferred_language": user.preferred_language
        }
        return profile_info

    async def get_cumulative_setup_intructions(self, session_id):
        system_prompts = await self.get_system_prompt()
        task_content, task_instruction, task_persona = await self.get_task_prompts(session_id)
        user_profile_details = await self.get_user_profile(session_id)

        # Combine and format the prompts
        prompt_value = f"""
            System: {system_prompts}
            Task Content: {task_content}
            Task Instruction: {task_instruction}
            Task Persona: {task_persona}
            User Profile: {user_profile_details}
            """
        return prompt_value


class AssisstantSessionManager(PromptHook):
    def __init__(self) -> None:
        super().__init__()
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        self.thread = None
        self.assistant = None

    async def setup(self, session_id):
        try:
            self.assistant = await self.get_assistant(session_id=session_id)
            self.thread = await self.get_thread(session_id=session_id)
            if self.assistant is None or self.thread is None:
                raise Exception(
                    f"Failed to assistant id: {self.assistant.id} and thread id: {self.thread.id}")
        except Exception as e:
            logger.error(f"Error setting up session manager: {e}")

    async def get_assistant(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        session = await sync_to_async(ChatSession.objects.get)(id=session_id)
        try:
            if session.assistant_id:
                assistant = self.client.beta.assistants.retrieve(
                    session.assistant_id)
                logger.debug(
                    f"Retrieved existing assistant id: {assistant.id}")
                return assistant
        except Exception as e:
            logger.error(f"Failed to fetch assistant: {e}")

        try:
            instruction_prompt = await self.get_cumulative_setup_intructions(session_id=session_id)
            assistant = self.client.beta.assistants.create(
                model="gpt-4o",
                instructions=instruction_prompt
            )
            session.assistant_id = assistant.id

            @sync_to_async
            def _session_save():
                session.save()
            await _session_save()
            logger.debug(f"Created new assistant: {assistant.id}")
            return assistant
        except Exception as e:
            logger.error(f"Error creating new assistant: {e}")
            return None

    async def get_thread(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        session = await sync_to_async(ChatSession.objects.get)(id=session_id)
        try:
            if session.thread_id:
                thread = self.client.beta.threads.retrieve(session.thread_id)
                logger.debug(f"Retrieved existing thread id: {thread.id}")
                return thread
        except Exception as e:
            logger.error(f"Failed to retrieve existing thread: {e}")

        try:
            thread = self.client.beta.threads.create()
            session.thread_id = thread.id

            @sync_to_async
            def _session_save():
                session.save()
            await _session_save()
            logger.debug(f"Created new thread: {thread.id}")
            return thread
        except Exception as e:
            logger.error(f"Error creating new thread: {e}")
            return None

    async def create_user_message(self, message):
        self.client.beta.threads.messages.create(
            thread_id=self.thread.id, role="user", content=message)

    async def get_run_stream(self):
        stream = self.client.beta.threads.runs.create(
            assistant_id=self.assistant.id,
            thread_id=self.thread.id,
            stream=True
        )
        return stream

    async def async_stream(self, stream):
        loop = asyncio.get_running_loop()
        for event in stream:
            yield await loop.run_in_executor(None, lambda: event)


session_manager = AssisstantSessionManager()


class BaseWebSocketConsumer(AsyncWebsocketConsumer):
    async def ping(self):
        while True:
            try:
                await self.send(text_data=json.dumps({"type": "ping"}))
                logger.debug("Ping sent")
            except Exception as e:
                logger.error(f"Error in ping: {e}")
                break
            await asyncio.sleep(30)  # Ping every 30 seconds


class ChatConsumer(BaseWebSocketConsumer):

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        try:
            await session_manager.setup(session_id=self.session_id)
            if session_manager.assistant is None or session_manager.thread is None:
                raise Exception("Assistant or thread setup failed")
            await self.accept()
            logger.debug(f"WebSocket connected: session_id={self.session_id}")
            asyncio.create_task(self.ping())
            try:
                if not cache.get(f'initial_message_sent_{self.session_id}', False):
                    initial_message = "Begin the conversation."
                    await session_manager.create_user_message(
                        message=initial_message)
                    await self.stream_text_response(message_id=0)
                    cache.set(f'initial_message_sent_{self.session_id}', True)
            except Exception as e:
                logger.error(f"Failed to initialize LLM instance: {e}")
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await self.close()

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        message_id = text_data_json["message_id"]
        await save_message_to_transcript(session_id=self.session_id, message_id=str(int(message_id)-1),
                                         user_message=message, bot_message=None, has_audio=False, audio_bytes=None)

        await session_manager.create_user_message(message=message)
        await self.stream_text_response(message_id)

    async def stream_text_response(self, message_id):
        stream = await session_manager.get_run_stream()
        bot_message_buffer = []
        try:
            async for event in session_manager.async_stream(stream):
                chunk = {}
                chunk["message_id"] = message_id
                if event.event == 'thread.run.created':
                    chunk["event"] = "on_parser_start"
                    await self.send(text_data=json.dumps(chunk))

                elif event.event == 'thread.message.delta':
                    chunk["event"] = "on_parser_stream"
                    chunk["value"] = event.data.delta.content[0].text.value
                    await self.send(text_data=json.dumps(chunk))
                    bot_message_buffer.append(chunk["value"])

                elif event.event == 'thread.run.completed':
                    chunk["event"] = "on_parser_end"
                    await self.send(text_data=json.dumps(chunk))
                    complete_bot_message = ''.join(bot_message_buffer)
                    await save_message_to_transcript(session_id=self.session_id, message_id=message_id,
                                                     user_message=None, bot_message=complete_bot_message, has_audio=False, audio_bytes=None)
                else:
                    # ignoring other response handlers
                    continue
        except Exception as e:
            logger.error(f"Error in chain events: {e}")


class AudioConsumer(BaseWebSocketConsumer):
    current_message_id = None
    audio_queue = deque()
    bot_audio_buffer = []
    bot_message_buffer = []

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        try:
            await session_manager.setup(session_id=self.session_id)
            if session_manager.assistant is None or session_manager.thread is None:
                raise Exception("Assistant or thread setup failed")
            await self.accept()
            logger.debug(
                f"Audio WebSocket connected: session_id={self.session_id}")
            asyncio.create_task(self.ping())
            try:
                if not cache.get(f'initial_message_sent_{self.session_id}', False):
                    initial_message = "Begin the conversation."
                    await session_manager.create_user_message(
                        message=initial_message)
                    await self.stream_audio_response(message_id=0)
                    cache.set(f'initial_message_sent_{self.session_id}', True)

            except Exception as e:
                logger.error(f"Failed to initialize LLM instance: {e}")
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await self.close()

    async def receive(self, bytes_data=None, text_data=None):
        if text_data:
            logger.debug(f"JSON message received: {text_data}")
            try:
                json_data = json.loads(text_data)
                if 'message_id' in json_data:
                    self.current_message_id = json_data['message_id']
                    logger.debug(
                        f"Current Message ID: {self.current_message_id}")
            except Exception as e:
                logger.error(f"Error parsing text data: {e}")

        if bytes_data:
            logger.debug(f"Audio data received: {type(bytes_data)}")
            if self.current_message_id is None:
                logger.error("Received audio data without message_id")
                return

            transcript = await self.process_audio(bytes_data)
            await save_message_to_transcript(session_id=self.session_id, message_id=self.current_message_id,
                                             user_message=transcript, bot_message=None, has_audio=True, audio_bytes=bytes_data)
            if transcript:
                await session_manager.create_user_message(message=transcript)
                await self.send(text_data=json.dumps({"transcript": transcript, "message_id": self.current_message_id}))
                assistant_message_id = str(int(self.current_message_id) + 1)
                await self.stream_audio_response(assistant_message_id)
            else:
                await self.send_audio_chunk(await self.text_to_speech("Sorry, I couldn't hear you."))

    async def process_audio(self, audio_data):
        logger.debug(f"Audio data size: {len(audio_data)} bytes")
        client = speech.SpeechClient()
        audio = speech.RecognitionAudio(content=audio_data)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="en-US",
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

    async def stream_audio_response(self, message_id):
        stream = await session_manager.get_run_stream()
        try:
            buffer = []
            async for event in session_manager.async_stream(stream):
                chunk = {}
                chunk["message_id"] = message_id
                if event.event == 'thread.run.created':
                    chunk["event"] = "on_parser_start"
                    await self.send(text_data=json.dumps(chunk))
                elif event.event == 'thread.message.delta':
                    chunk["event"] = "on_parser_stream"
                    chunk["value"] = event.data.delta.content[0].text.value
                    buffer.append(chunk["value"])
                    self.bot_message_buffer.append(chunk["value"])
                    await self.send(text_data=json.dumps(chunk))
                    if any(p in buffer[-1] for p in ['.', '!', '?', ';', ',']):
                        batched_text = ' '.join(buffer)
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
                        processed_text = self.process_text_for_tts(
                            batched_text)
                        audio_chunk = await self.text_to_speech(processed_text)
                        self.bot_audio_buffer.append(audio_chunk)
                        self.audio_queue.append(audio_chunk)
                        asyncio.create_task(self.send_audio_chunk())
                    await self.send(text_data=json.dumps({'event': 'on_parser_end'}))
                    complete_bot_message = ''.join(self.bot_message_buffer)
                    complete_audio = b''.join(self.bot_audio_buffer)
                    await save_message_to_transcript(session_id=self.session_id, message_id=message_id,
                                                     user_message=None, bot_message=complete_bot_message, has_audio=True, audio_bytes=complete_audio)
                    self.bot_audio_buffer.clear()
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

    async def text_to_speech(self, text):
        client = texttospeech.TextToSpeechClient()
        ssml_text = f"<speak>{text}</speak>"
        input_text = texttospeech.SynthesisInput(ssml=ssml_text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Standard-F",
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1,
            pitch=0.0,
        )
        response = client.synthesize_speech(
            input=input_text, voice=voice, audio_config=audio_config)
        return response.audio_content
