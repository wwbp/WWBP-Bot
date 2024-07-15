import json
import logging
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from config.asgi import application
from accounts.models import Module, Task, ChatSession

User = get_user_model()

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class ConcurrentChatTest(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user1 = User.objects.create_user(
            username='abigail',
            password='password',
            email='abigail@example.com',
            role='student'
        )
        self.user2 = User.objects.create_user(
            username='max',
            password='password',
            email='max@example.com',
            role='student'
        )

        self.module = Module.objects.create(
            name='Test Module',
            created_by=self.user1,
            content='Module Content'
        )

        self.task = Task.objects.create(
            title='Test Task',
            content='Task Content',
            module=self.module,
            instruction_prompt='Instruction Prompt',
            persona_prompt='Persona Prompt'
        )

        self.session1 = ChatSession.objects.create(
            user=self.user1,
            module=self.module,
            task=self.task
        )

        self.session2 = ChatSession.objects.create(
            user=self.user2,
            module=self.module,
            task=self.task
        )

    def tearDown(self):
        User.objects.all().delete()
        Module.objects.all().delete()
        Task.objects.all().delete()
        ChatSession.objects.all().delete()

    async def test_concurrent_chat_sessions(self):
        communicator1 = WebsocketCommunicator(
            application, f"/ws/chat/{self.session1.id}/")
        communicator2 = WebsocketCommunicator(
            application, f"/ws/chat/{self.session2.id}/")

        connected1, _ = await communicator1.connect(timeout=10)
        connected2, _ = await communicator2.connect(timeout=10)

        self.assertTrue(connected1)
        self.assertTrue(connected2)

        # Simulate abigail and max sending multiple messages
        for i in range(5):
            await communicator1.send_json_to({"message": "What is my name?", "message_id": i+1})
            response1 = await self.receive_non_ping_message(communicator1)
            response1_text = response1.get('value', '')
            self.assertIn("abigail", response1_text,
                          f"Iteration {i+1}: Expected 'abigail' in response but got {response1}")
            self.assertNotIn(
                "max", response1_text, f"Iteration {i+1}: Did not expect 'max' in response but got {response1_text}")

            await communicator2.send_json_to({"message": "What is my name?", "message_id": i+1})
            response2 = await self.receive_non_ping_message(communicator2)
            response2_text = response2.get('value', '')
            self.assertIn("max", response2_text,
                          f"Iteration {i+1}: Expected 'max' in response but got {response2_text}")
            self.assertNotIn("abigail", response2_text,
                             f"Iteration {i+1}: Did not expect 'abigail' in response but got {response2_text}")

        await communicator1.disconnect()
        await communicator2.disconnect()

    async def receive_non_ping_message(self, communicator):
        while True:
            response = await communicator.receive_json_from()
            if response.get('type') == 'ping':
                logger.debug("Ping message received")
                continue
            return response
