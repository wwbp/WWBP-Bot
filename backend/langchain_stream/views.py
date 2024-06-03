import asyncio
import json
import os
import logging
from collections import deque
from channels.generic.websocket import AsyncWebsocketConsumer
from google.cloud import speech, texttospeech
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import re

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("user", "{input}")
])

llm = ChatOpenAI(model="gpt-4o", api_key=os.getenv("OPENAI_API_KEY", ""))
output_parser = StrOutputParser()
chain = prompt | llm.with_config(
    {"run_name": "model"}) | output_parser.with_config({"run_name": "Assistant"})


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

    async def disconnect(self, close_code):
        logger.debug(
            f"WebSocket disconnected: session_id={self.session_id}, close_code={close_code}")

    async def receive(self, text_data):
        logger.debug(f"Message received: {text_data}")
        text_data_json = json.loads(text_data)
        message = text_data_json["message"]
        message_id = text_data_json["message_id"]
        try:
            async for chunk in chain.astream_events({'input': message}, version="v1", include_names=["Assistant"]):
                chunk["message_id"] = message_id
                if chunk["event"] in ["on_parser_start", "on_parser_stream"]:
                    await self.send(text_data=json.dumps(chunk))
                    logger.debug(f"Chunk sent: {chunk}")
                elif chunk["event"] == "on_parser_end":
                    await self.send(text_data=json.dumps({'event': 'on_parser_end'}))
                else:
                    logger.error(f"Unknown 'chunk' event: {chunk['event']}")
        except Exception as e:
            logger.error(f"Error: {e}")


class AudioConsumer(BaseWebSocketConsumer):
    current_message_id = None
    audio_queue = deque()

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        await self.accept()
        logger.debug(
            f"Audio WebSocket connected: session_id={self.session_id}")
        asyncio.create_task(self.ping())

    async def disconnect(self, close_code):
        logger.debug(
            f"Audio WebSocket disconnected: session_id={self.session_id}, close_code={close_code}")

    async def receive(self, bytes_data=None, text_data=None):
        if text_data:
            logger.debug(f"JSON message received: {text_data}")
            json_data = json.loads(text_data)
            if 'message_id' in json_data:
                self.current_message_id = json_data['message_id']
                logger.debug(f"Current Message ID: {self.current_message_id}")

        if bytes_data:
            logger.debug(f"Audio data received: {type(bytes_data)}")
            if self.current_message_id is None:
                logger.error("Received audio data without message_id")
                return

            transcript = await self.process_audio(bytes_data)
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
            async for chunk in chain.astream_events({'input': text}, version="v1", include_names=["Assistant"]):
                if chunk["event"] == "on_parser_start":
                    chunk["message_id"] = message_id
                    await self.send(text_data=json.dumps(chunk))
                elif chunk["event"] == "on_parser_stream":
                    if 'chunk' in chunk['data']:
                        buffer.append(chunk['data']['chunk'])
                        chunk["message_id"] = message_id
                        await self.send(text_data=json.dumps(chunk))
                        if any(p in buffer[-1] for p in ['.', '!', '?', ';', ',']):
                            batched_text = ' '.join(buffer)
                            buffer = []
                            processed_text = self.process_text_for_tts(
                                batched_text)
                            audio_chunk = await self.text_to_speech(processed_text)
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
                        self.audio_queue.append(audio_chunk)
                        asyncio.create_task(self.send_audio_chunk())
                    await self.send(text_data=json.dumps({'event': 'on_parser_end'}))
                else:
                    logger.error(f"Unknown 'chunk' event: {chunk['event']}")
        except Exception as e:
            logger.error(f"Error: {e}")

    async def send_audio_chunk(self, audio_chunk=None):
        if audio_chunk:
            self.audio_queue.append(audio_chunk)
        while self.audio_queue:
            audio_chunk = self.audio_queue.popleft()
            await self.send(bytes_data=audio_chunk)
            # await asyncio.sleep(1)  # Adjust as needed for smooth playback

    def process_text_for_tts(self, text):
        text = re.sub(r'[,.!?;]', '', text)
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
