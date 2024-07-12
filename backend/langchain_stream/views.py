import asyncio
import json
import logging
import os
import re
from collections import deque

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps
from django.core.cache import cache
from google.cloud import speech, texttospeech
from langchain_stream.tasks import save_message_to_transcript, get_file_streams
from openai import OpenAI

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}" if ENVIRONMENT == 'local' else f"rediss://{REDIS_HOST}:{REDIS_PORT}"


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
            return task.content, task.instruction_prompt, task.persona_prompt
        except Exception as e:
            logger.error(f"Error fetching task prompts: {e}")

    @sync_to_async
    def get_user_profile(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        try:
            session = ChatSession.objects.get(id=session_id)
            user = session.user
            return {
                "username": user.username,
                "role": user.role,
                "grade": user.grade,
                "preferred_language": user.preferred_language
            }
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")

    async def get_cumulative_setup_instructions(self, session_id):
        try:
            system_prompts = await self.get_system_prompt()
            task_content, task_instruction, task_persona = await self.get_task_prompts(session_id)
            user_profile_details = await self.get_user_profile(session_id)
            module_content = await self.get_module_prompts(session_id)
            return f"""
                System: {system_prompts}
                Module Content: {module_content}
                Task Content: {task_content}
                Task Instruction: {task_instruction}
                Task Persona: {task_persona}
                User Profile: {user_profile_details}
            """
        except Exception as e:
            logger.error(f"Error creating cumulative setup instructions: {e}")
            return "Error in generating instructions."


class AssistantSessionManager(PromptHook):
    def __init__(self):
        super().__init__()
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
        self.thread = None
        self.assistant = None
        self.vector_store = None

    async def setup(self, session_id):
        try:
            self.assistant = await self.get_assistant(session_id=session_id)
            self.thread = await self.get_thread(session_id=session_id)
            if not self.assistant or not self.thread:
                raise Exception("Assistant or thread setup failed")

            # Try to upload files to vector store, but don't fail if no files are found
            try:
                # Initialize vector store and upload files
                self.vector_store = await self.initialize_vector_store(session_id)
                if self.vector_store:
                    await self.update_assistant_with_vector_store()
            except Exception as e:
                logger.error(f"Error uploading files to vector store: {e}")
                logger.debug("Proceeding without file uploads")

        except Exception as e:
            logger.error(f"Error setting up session manager: {e}")

    async def get_assistant(self, session_id):
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
            assistant = self.client.beta.assistants.create(
                model="gpt-4o",
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
        try:
            self.client.beta.threads.messages.create(
                thread_id=self.thread.id, role="user", content=message
            )
        except Exception as e:
            logger.error(f"Error creating user message: {e}")

    async def get_run_stream(self):
        try:
            stream = self.client.beta.threads.runs.create(
                assistant_id=self.assistant.id,
                thread_id=self.thread.id,
                stream=True
            )
            return stream
        except Exception as e:
            logger.error(f"Error getting run stream: {e}")
            return None

    async def async_stream(self, stream):
        try:
            loop = asyncio.get_running_loop()
            for event in stream:
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


session_manager = AssistantSessionManager()


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
        self.user = self.scope["user"]
        self.room_group_name = f"chat_{self.session_id}"

        logger.debug(
            f"Attempting WebSocket connection: session_id={self.session_id}, user={self.user}")

        try:
            await session_manager.setup(session_id=self.session_id)
            if not session_manager.assistant or not session_manager.thread:
                raise Exception("Assistant or thread setup failed")

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            logger.debug(f"WebSocket connected: session_id={self.session_id}")
            asyncio.create_task(self.ping())

            if not cache.get(f'initial_message_sent_{self.session_id}', False):
                initial_message = "Begin the conversation."
                await session_manager.create_user_message(message=initial_message)
                await self.stream_text_response(message_id=1)
                cache.set(f'initial_message_sent_{self.session_id}', True)

        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await self.close()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.debug(
                f"WebSocket disconnected: session_id={self.session_id}, close_code={close_code}")
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {e}")
        await super().disconnect(close_code)

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        message_id = text_data_json["message_id"]

        logger.debug(f"Received message: {message}, message_id={message_id}")

        try:
            await save_message_to_transcript(session_id=self.session_id, message_id=str(int(message_id)-1),
                                             user_message=message, bot_message=None, has_audio=False, audio_bytes=None)
            await session_manager.create_user_message(message=message)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message_id': message_id
                }
            )
        except Exception as e:
            logger.error(f"Error processing received message: {e}")

    async def chat_message(self, event):
        message_id = event['message_id']

        await self.stream_text_response(message_id)

    async def stream_text_response(self, message_id):
        stream = await session_manager.get_run_stream()
        bot_message_buffer = []
        logger.debug(f"Streaming text response for message_id={message_id}")
        try:
            async for event in session_manager.async_stream(stream):
                chunk = {}
                chunk["message_id"] = message_id
                if event.event == 'thread.run.created':
                    chunk["event"] = "on_parser_start"
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'send_message_to_group',
                            'chunk': chunk
                        }
                    )
                elif event.event == 'thread.message.delta':
                    chunk["event"] = "on_parser_stream"
                    chunk["value"] = event.data.delta.content[0].text.value
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'send_message_to_group',
                            'chunk': chunk
                        }
                    )
                    bot_message_buffer.append(chunk["value"])
                elif event.event == 'thread.run.completed':
                    chunk["event"] = "on_parser_end"
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'send_message_to_group',
                            'chunk': chunk
                        }
                    )
                    complete_bot_message = ''.join(bot_message_buffer)
                    await save_message_to_transcript(session_id=self.session_id, message_id=message_id,
                                                     user_message=None, bot_message=complete_bot_message, has_audio=False, audio_bytes=None)
                    bot_message_buffer.clear()
                else:
                    continue
        except Exception as e:
            logger.error(f"Error in chain events: {e}")

    async def send_message_to_group(self, event):
        await self.send(text_data=json.dumps(event['chunk']))


class AudioConsumer(BaseWebSocketConsumer):
    current_message_id = None
    audio_queue = deque()
    bot_audio_buffer = []
    bot_message_buffer = []

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        try:
            await session_manager.setup(session_id=self.session_id)
            if not session_manager.assistant or not session_manager.thread:
                raise Exception("Assistant or thread setup failed")
            await self.accept()
            logger.debug(
                f"Audio WebSocket connected: session_id={self.session_id}")
            asyncio.create_task(self.ping())

            if not cache.get(f'initial_message_sent_{self.session_id}', False):
                initial_message = "Begin the conversation."
                await session_manager.create_user_message(message=initial_message)
                await self.stream_audio_response(message_id=1)
                cache.set(f'initial_message_sent_{self.session_id}', True)

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
        try:
            response = client.synthesize_speech(
                input=input_text, voice=voice, audio_config=audio_config)
            return response.audio_content
        except Exception as e:
            logger.error(f"Error during text-to-speech synthesis: {e}")
            return b""
