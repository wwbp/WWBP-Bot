from channels.generic.websocket import AsyncWebsocketConsumer
import json
import openai
import os

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json['message']

        async for response_chunk in self.stream_gpt_response(message):
            await self.send(text_data=json.dumps({
                'message': response_chunk
            }))

    async def stream_gpt_response(self, user_message):
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_message}
            ],
            stream=True
        )

        for chunk in response:
            chunk_message = chunk.choices[0].delta.content
            if chunk_message:
                yield chunk_message
