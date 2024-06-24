import asyncio
import json
import os
import logging
from collections import deque
from channels.generic.websocket import AsyncWebsocketConsumer
from google.cloud import speech, texttospeech
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.prompts.chat import MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
import re
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from asgiref.sync import sync_to_async
from .tasks import save_message_to_transcript
from django.apps import apps


logging.basicConfig(level=logging.DEBUG)

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')

if ENVIRONMENT == 'production':
    REDIS_URL = f'rediss://{REDIS_HOST}:{REDIS_PORT}'
else:
    REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}'


class LangChainSessionManager:
    @sync_to_async
    def get_system_prompt(self):
        SystemPrompt = apps.get_model('accounts', 'SystemPrompt')
        try:
            prompt = SystemPrompt.objects.latest('created_at').prompt
            return prompt
        except SystemPrompt.DoesNotExist:
            return "You are a helpful assistant."

    @sync_to_async
    def get_task_prompts(self, session_id):
        ChatSession = apps.get_model('accounts', 'ChatSession')
        session = ChatSession.objects.get(id=session_id)
        task = session.task
        return task.content, task.instruction_prompt, task.persona_prompt

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

    async def get_llm_instance(self, session_id):
        try:
            llm = ChatOpenAI(
                model="gpt-4o", api_key=os.getenv("OPENAI_API_KEY", ""))

            # prompt library
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

            prompt = ChatPromptTemplate.from_messages([
                ("system", "{system}"),
                MessagesPlaceholder("history"),
                ("user", "{question}")
            ])
            output_parser = StrOutputParser()
            chain = prompt | llm.with_config(
                {"run_name": "model"}) | output_parser.with_config({"run_name": "Assistant"})
            chain_with_history = RunnableWithMessageHistory(
                chain,
                lambda session_id: RedisChatMessageHistory(
                    session_id,
                    url=REDIS_URL
                ),
                input_messages_key="question",
                history_messages_key="history",
            )
            logger.debug(
                f"Chain with history created for session_id={session_id}")
            return chain_with_history.with_config({
                'configurable': {"session_id": session_id}}), prompt_value
        except Exception as e:
            logger.error(
                f"Error creating LLM instance for session_id {session_id}: {e}")
            raise


session_manager = LangChainSessionManager()


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
        await self.accept()
        logger.debug(f"WebSocket connected: session_id={self.session_id}")
        asyncio.create_task(self.ping())

        # Initialize LLM with memory for this session
        try:
            self.chain, self.prompt_value = await session_manager.get_llm_instance(self.session_id)
            logger.debug(
                f"LLM instance initialized for session_id={self.session_id}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM instance: {e}")

    async def receive(self, text_data):
        logger.debug(f"Message received: {text_data}")
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json["message"]
            message_id = text_data_json["message_id"]
            # save_message_to_transcript.delay(session_id=self.session_id, message_id=str(int(message_id)-1),
            #                                  user_message=message, bot_message=None, has_audio=False, audio_bytes=None)
        except Exception as e:
            logger.error(f"Error parsing message: {e}")
            return

        try:
            logger.debug(f"Starting chain events with message: {message}")
            bot_message_buffer = []
            async for chunk in self.chain.astream_events(
                {'question': message,
                 'system': self.prompt_value
                 },
                version="v1",
                include_names=["Assistant"],
            ):
                logger.debug(f"Chunk received: {chunk}")
                chunk["message_id"] = message_id
                if chunk["event"] in ["on_parser_start", "on_parser_stream"]:
                    await self.send(text_data=json.dumps(chunk))
                    logger.debug(f"Chunk sent: {chunk}")
                    if 'chunk' in chunk['data']:
                        bot_message_buffer.append(chunk['data']['chunk'])
                elif chunk["event"] == "on_parser_end":
                    await self.send(text_data=json.dumps({'event': 'on_parser_end'}))
                    complete_bot_message = ''.join(bot_message_buffer)
                    # save_message_to_transcript.delay(session_id=self.session_id, message_id=message_id,
                    #                                  user_message=None, bot_message=complete_bot_message, has_audio=False, audio_bytes=None)
                else:
                    logger.error(
                        f"Unknown 'chunk' event: {chunk.get('event', 'no event')}")
        except Exception as e:
            logger.error(f"Error in chain events: {e}")


class AudioConsumer(BaseWebSocketConsumer):
    current_message_id = None
    audio_queue = deque()
    bot_audio_buffer = []
    bot_message_buffer = []

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        await self.accept()
        logger.debug(
            f"Audio WebSocket connected: session_id={self.session_id}")
        asyncio.create_task(self.ping())

        # Initialize LLM with memory for this session
        try:
            self.chain, self.prompt_value = await session_manager.get_llm_instance(self.session_id)
            logger.debug(
                f"LLM instance initialized for session_id={self.session_id}")
        except Exception as e:
            logger.error(f"Failed to initialize LLM instance: {e}")

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
            # save_message_to_transcript.delay(session_id=self.session_id, message_id=self.current_message_id,
            #                                  user_message=transcript, bot_message=None, has_audio=True, audio_bytes=bytes_data)
            if transcript:
                logger.debug(f"Transcript: {transcript}")
                await self.send(text_data=json.dumps({"transcript": transcript, "message_id": self.current_message_id}))
                assistant_message_id = str(int(self.current_message_id) + 1)
                await self.stream_audio_response(transcript, assistant_message_id)
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

    async def stream_audio_response(self, text, message_id):
        try:
            buffer = []  # Buffer to collect tokens
            logger.debug(f"Starting chain events with text: {text}")
            async for chunk in self.chain.astream_events(
                {'question': text,
                 'system': self.prompt_value
                 },
                version="v1",
                include_names=["Assistant"],
            ):
                logger.debug(f"Chunk received: {chunk}")
                if chunk["event"] == "on_parser_start":
                    chunk["message_id"] = message_id
                    await self.send(text_data=json.dumps(chunk))
                elif chunk["event"] == "on_parser_stream":
                    if 'chunk' in chunk['data']:
                        buffer.append(chunk['data']['chunk'])
                        self.bot_message_buffer.append(chunk['data']['chunk'])
                        chunk["message_id"] = message_id
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
                    else:
                        logger.error(f"Missing 'chunk' in data: {chunk}")
                elif chunk["event"] == "on_parser_end":
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
                    # save_message_to_transcript.delay(session_id=self.session_id, message_id=message_id,
                    #                                  user_message=None, bot_message=complete_bot_message, has_audio=True, audio_bytes=complete_audio)
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
            input=input_text, voice=voice, audio_config=audio_config
        )
        return response.audio_content
