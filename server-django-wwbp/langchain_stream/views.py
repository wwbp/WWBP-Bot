import asyncio
import json
import logging
import os
import re
from collections import deque
import requests

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.apps import apps
from django.core.cache import cache
from google.cloud import speech, texttospeech
from langchain_stream.tasks import save_message_to_transcript, get_file_streams, save_usage_stats
from openai import OpenAI

DEFAULT_VOICE_ID = "en-US-Wavenet-D"
CHUNK_SIZE = 1024

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


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
                "preferred_language": user.preferred_language,
                "voice_speed": user.voice_speed
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
        self.run_active = False

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
                # logger.debug(
                #     f"Retrieved existing assistant id: {assistant.id}")
                return assistant

            instruction_prompt = await self.get_cumulative_setup_instructions(session_id=session_id)
            # logger.debug(
            #     f"The instruction prompt for session: {session_id} is as follows: {instruction_prompt}")
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

    async def  get_run_stream(self):
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
                initial_message = "Begin the conversation."
                await self.session_manager.create_user_message(message=initial_message)
                await self.channel_layer.group_send(self.room_group_name, {"type": "stream_text_response", "message_id": 1})
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
        message_id = text_data_json["message_id"]

        logger.debug(
            f"Received message: {message}, message_id={message_id}, from user in session: {self.session_id}")

        try:
            await save_message_to_transcript(session_id=self.session_id, message_id=str(int(message_id)-1),
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
    current_message_id = None
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
                initial_message = "Begin the conversation."
                await self.session_manager.create_user_message(message=initial_message)
                await self.channel_layer.group_send(self.room_group_name, {"type": "stream_audio_response", "message_id": 1})
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
                await self.session_manager.create_user_message(message=transcript)
                await self.send(text_data=json.dumps({"transcript": transcript, "message_id": self.current_message_id}))
                assistant_message_id = str(int(self.current_message_id) + 1)
                await self.channel_layer.group_send(self.room_group_name, {"type": "stream_audio_response", "message_id": assistant_message_id})

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
            enable_automatic_punctuation=True,
        )
        try:
            response = client.recognize(config=config, audio=audio)
            if not response.results:
                logger.error("No results from speech recognition")
                return ""
            transcript = response.results[0].alternatives[0].transcript
            logger.debug(f"Transcript is: {transcript}")
            return transcript
        except Exception as e:
            logger.error(f"Error during speech recognition: {e}")
            return ""

    async def stream_audio_response(self, event):
        message_id = event["message_id"]
        stream = await self.session_manager.get_run_stream()
        try:
            buffer = []
            incomplete_word_buffer = ""
            async for event in self.session_manager.async_stream(stream):
                chunk = {}
                chunk["message_id"] = message_id
                if event.event == 'thread.run.created':
                    chunk["event"] = "on_parser_start"
                    await self.send(text_data=json.dumps(chunk))
                elif event.event == 'thread.message.delta':
                    chunk["event"] = "on_parser_stream"
                    chunk["value"] = event.data.delta.content[0].text.value
                    logger.debug(f"Chunk value: {chunk['value']}")

                    if incomplete_word_buffer:
                        chunk["value"] = incomplete_word_buffer + chunk["value"]
                        incomplete_word_buffer = ""

                    buffer.append(chunk["value"])
                    # self.bot_message_buffer.append(chunk["value"])
                    # logger.debug(f"Buffer self.bot_message_buffer: {self.bot_message_buffer}")
                    # await self.send(text_data=json.dumps(chunk))

                    if chunk["value"][-1].isalnum() and not chunk["value"][-1].isspace():
                        incomplete_word_buffer = buffer.pop()
                        logger.debug(f"Incomplete word buffer: {incomplete_word_buffer}")
                        

                    if len(buffer) and any(p in buffer[-1] for p in ['.', '!', '?', ';', ',']):
                        batched_text = ' '.join(buffer)
                        logger.debug(f"Buffer in 1: {buffer}")
                        logger.debug(f"Batched text: {batched_text}")
                        buffer = []
                        self.bot_message_buffer.append(batched_text)
                        final_chunk = {
                            "message_id": message_id,
                            "event": "on_parser_stream",
                            "value": batched_text
                        }
                        await self.send(text_data=json.dumps(final_chunk))                        
                        logger.debug(f"Buffer self.bot_message_buffer: {self.bot_message_buffer}")
                        # processed_text = self.process_text_for_tts(
                        #     batched_text)
                        processed_text = batched_text
                        audio_chunk = await self.text_to_speech(processed_text)
                        self.bot_audio_buffer.append(audio_chunk)
                        self.audio_queue.append(audio_chunk)
                        asyncio.create_task(self.send_audio_chunk())
                        logger.debug(
                            f"Audio chunk queued: {len(audio_chunk)} bytes")
                elif event.event == 'thread.run.completed':
                    if buffer:
                        logger.debug(f"Buffer: {buffer}")
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
        logger.debug(f"Text to process: {text}")
        text = re.sub(r'[,.!?;*#]', '', text)
        return text
    
    # async def fetch_available_voices(self):
    #     url = "https://api.elevenlabs.io/v1/voices"
    #     headers = {
    #         "Accept": "application/json",
    #         "xi-api-key": os.getenv("XI_API_KEY", ""),
    #         "Content-Type": "application/json"
    #     }
    #     response = requests.get(url, headers=headers)
    #     if response.ok:
    #         data = response.json()
    #         return data['voices']
    #     else:
    #         logger.error(f"Error fetching voices: {response.text}")
    #         return []

    # def get_voice_id(self, voices, user_preference=None):
    #     # If user preference is provided, try to find the matching voice
    #     if user_preference:
    #         for voice in voices:
    #             if voice['name'].lower() == user_preference.lower():
    #                 return voice['voice_id']
    
    # # Return the default voice ID if no user preference is matched
    #     return DEFAULT_VOICE_ID
        
    async def text_to_speech(self, text):
        # voices = await self.fetch_available_voices()
        logger.debug(f"Text to speech: {text}")
        # voice_id = self.get_voice_id(voices,'Laura')
        voice_id = "pNInz6obpgDQGcFmaJgB"
        logger.debug(f"Voice ID: {voice_id}")

        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

        headers = {
            "Accept": "application/json",
            "xi-api-key": os.getenv("XI_API_KEY", ""),
        }

        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }

        response = requests.post(tts_url, headers=headers, json=data, stream=True)

        if response.ok:
            audio_content = b''
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                if chunk:
                    audio_content += chunk
            logger.info("Audio stream received successfully.")
            return audio_content
        else:
            logger.error(f"Error in text_to_speech: {response.text}")
            await self.send(text_data=json.dumps({"error": response.text}))
            return b""

    #Google Text to Speech
    # async def text_to_speech(self, text):
    #     logger.debug(f"Text to speech: {text}")
    #     client = texttospeech.TextToSpeechClient()
    #     ssml_text = f"<speak>{text}</speak>"
    #     input_text = texttospeech.SynthesisInput(ssml=ssml_text)
    #     voice = texttospeech.VoiceSelectionParams(
    #         language_code="en-IN",
    #         name="en-IN-Standard-A",
    #         ssml_gender=texttospeech.SsmlVoiceGender.FEMALE,
    #     )
    #     voice_speed = 1.0
    #     user_profile = await self.session_manager.get_user_profile(self.session_id)
    #     voice_speed = float(user_profile['voice_speed'])

    #     audio_config = texttospeech.AudioConfig(
    #         audio_encoding=texttospeech.AudioEncoding.MP3,
    #         speaking_rate=voice_speed if voice_speed else 1.0,
    #         pitch=0.0,
    #     )
    #     try:
    #         response = client.synthesize_speech(
    #             input=input_text, voice=voice, audio_config=audio_config)
    #         return response.audio_content
    #     except Exception as e:
    #         logger.error(f"Error during text-to-speech synthesis: {e}")
    #         return b""

    #Whisper Model    
    # async def text_to_speech(self, text):
    #     client = OpenAI()
    #     logger.debug(f"Text to speech: {text}")

    #     try: 
    #         response = client.audio.speech.create(
    #             model="tts-1",
    #             voice="nova",
    #             input=text
    #         )
    #         # logger.debug("Got Response: %s", response)
    #         # The response will contain the audio content
    #         # audio_content = response['audio']
    #         output_filename = "output.mp3"
    #         response.stream_to_file(output_filename)
    #         with open(output_filename, "rb") as audio_file:
    #             audio_bytes = audio_file.read()
            
    #         logger.debug("Fetched audio bytes")
    #         logger.debug("Type of audio_bytes: %s", type(audio_bytes))
    #         return audio_bytes
    #     except Exception as e:
    #         logger.error(f"Error during text-to-speech synthesis: {e}")
    #         return b""         
