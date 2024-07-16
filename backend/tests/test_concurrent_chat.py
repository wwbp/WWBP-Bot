import asyncio
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from config.asgi import application
from accounts.models import Module, Task, ChatSession

User = get_user_model()


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

        async def receive_messages(communicator, expected_name):
            messages = []
            while len(messages) < 5:
                try:
                    response = await communicator.receive_json_from(timeout=20)
                except asyncio.TimeoutError:
                    print(
                        f"Timeout while waiting for message for {expected_name}")
                    break

                if response.get('type') == 'ping':
                    continue
                event = response.get('event')
                if event == 'on_parser_start':
                    messages.append("")
                elif event == 'on_parser_stream':
                    if messages:
                        messages[-1] += response.get('value', '')
                elif event == 'on_parser_end':
                    continue
            return messages

        async def send_messages(communicator, username):
            for i in range(5):
                await communicator.send_json_to({"message": "What is my name?", "message_id": i + 1})
                await asyncio.sleep(0.1)  # wait for a bit to receive response

        # Start sending messages concurrently
        await asyncio.gather(
            send_messages(communicator1, 'abigail'),
            send_messages(communicator2, 'max')
        )

        # Start receiving messages concurrently
        messages1 = await receive_messages(communicator1, 'abigail')
        messages2 = await receive_messages(communicator2, 'max')

        # Assertions for user1 (abigail)
        for i, response1_text in enumerate(messages1):
            self.assertIn("abigail", response1_text.lower(),
                          f"Iteration {i + 1}: Expected 'abigail' in response but got {response1_text}")
            self.assertNotIn("max", response1_text.lower(),
                             f"Iteration {i + 1}: Did not expect 'max' in response but got {response1_text}")

        # Assertions for user2 (max)
        for i, response2_text in enumerate(messages2):
            self.assertIn("max", response2_text.lower(),
                          f"Iteration {i + 1}: Expected 'max' in response but got {response2_text}")
            self.assertNotIn("abigail", response2_text.lower(),
                             f"Iteration {i + 1}: Did not expect 'abigail' in response but got {response2_text}")

        await communicator1.disconnect()
        await communicator2.disconnect()
