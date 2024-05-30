import asyncio
import json
import os
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from google.cloud import speech, texttospeech
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Configure logging
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


class ChatConsumer(AsyncWebsocketConsumer):

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
        try:
            async for chunk in chain.astream_events({'input': message}, version="v1", include_names=["Assistant"]):
                if chunk["event"] in ["on_parser_start", "on_parser_stream"]:
                    await self.send(text_data=json.dumps(chunk))
                    logger.debug(f"Chunk sent: {chunk}")
        except Exception as e:
            logger.error(f"Error: {e}")

    async def ping(self):
        while True:
            try:
                await self.send(text_data=json.dumps({"type": "ping"}))
                logger.debug("Ping sent")
            except Exception as e:
                logger.error(f"Error in ping: {e}")
                break
            await asyncio.sleep(30)  # Ping every 30 seconds


class AudioConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        await self.accept()
        logger.debug(
            f"Audio WebSocket connected: session_id={self.session_id}")
        asyncio.create_task(self.ping())

    async def disconnect(self, close_code):
        logger.debug(
            f"Audio WebSocket disconnected: session_id={self.session_id}, close_code={close_code}")

    async def receive(self, bytes_data=None):
        logger.debug("Audio data received")
        if bytes_data:
            transcript = await self.process_audio(bytes_data)
            logger.debug(f"Transcript: {transcript}")
            await self.stream_audio_response(transcript)

    async def process_audio(self, audio_data):
        client = speech.SpeechClient()
        audio = speech.RecognitionAudio(content=audio_data)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code="en-US",
        )
        response = client.recognize(config=config, audio=audio)
        transcript = ""
        for result in response.results:
            transcript += result.alternatives[0].transcript
        return transcript

    async def stream_audio_response(self, text):
        try:
            async for chunk in chain.astream_events({'input': text}, version="v1", include_names=["Assistant"]):
                if chunk["event"] in ["on_parser_start", "on_parser_stream"]:
                    audio_chunk = await self.text_to_speech(chunk["data"]["chunk"])
                    await self.send(bytes_data=audio_chunk)
                    logger.debug(f"Audio chunk sent: {chunk}")
        except Exception as e:
            logger.error(f"Error: {e}")

    async def text_to_speech(self, text):
        client = texttospeech.TextToSpeechClient()
        input_text = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
        )
        response = client.synthesize_speech(
            input=input_text, voice=voice, audio_config=audio_config
        )
        return response.audio_content

    async def ping(self):
        while True:
            try:
                await self.send(text_data=json.dumps({"type": "ping"}))
                logger.debug("Ping sent")
            except Exception as e:
                logger.error(f"Error in ping: {e}")
                break
            await asyncio.sleep(30)  # Ping every 30 seconds
