from channels.generic.websocket import AsyncWebsocketConsumer
import json
import openai
import os
import logging
import asyncio

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.debug("WebSocket connection established")
        await self.accept()

    async def disconnect(self, close_code):
        logger.debug(f"WebSocket connection closed with code {close_code}")

    async def receive(self, text_data):
        logger.debug(f"Received message: {text_data}")
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        await self.send(text_data=json.dumps({
            'message': 'Generating response...'
        }))

        asyncio.create_task(self.send_streaming_response(message))

    async def send_streaming_response(self, user_message):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": user_message}
                ],
                stream=True
            )

            for chunk in response:
                logger.debug(f"Chunk received: {chunk}")
                if hasattr(chunk, "choices"):
                    for choice in chunk.choices:
                        if hasattr(choice.delta, "content"):
                            chunk_message = choice.delta.content
                            if chunk_message:
                                logger.debug(
                                    f"Sending chunk message: {chunk_message}")
                                await self.send(text_data=json.dumps({
                                    'message': chunk_message
                                }))
                        else:
                            logger.error("No content found in delta")
                            await self.send(text_data=json.dumps({
                                'error': 'No content found in delta'
                            }))
                else:
                    logger.error("No choices found in chunk")
                    await self.send(text_data=json.dumps({
                        'error': 'No choices found in chunk'
                    }))
        except Exception as e:
            logger.error(f"Exception during streaming response: {str(e)}")
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))
