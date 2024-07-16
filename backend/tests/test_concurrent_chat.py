import asyncio
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
        self.student1 = User.objects.create_user(
            username='abigail',
            password='password',
            email='abigail@example.com',
            role='student'
        )
        self.student2 = User.objects.create_user(
            username='zoey',
            password='password',
            email='zoey@example.com',
            role='student'
        )
        self.teacher = User.objects.create_user(
            username='teach',
            password='password',
            email='teach@example.com',
            role='teacher'
        )

        self.module = Module.objects.create(
            name='Test Module',
            created_by=self.teacher,
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
            user=self.student1,
            module=self.module,
            task=self.task
        )

        logger.debug(
            f"session id for user: {self.student1.username} is {self.session1.id} ")

        self.session2 = ChatSession.objects.create(
            user=self.student2,
            module=self.module,
            task=self.task
        )

        logger.debug(
            f"session id for user: {self.student2.username} is {self.session2.id} ")

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

        connected1, _ = await communicator1.connect(timeout=30)
        connected2, _ = await communicator2.connect(timeout=30)

        self.assertTrue(connected1)
        self.assertTrue(connected2)

        async def send_message(communicator, message, message_id):
            await communicator.send_json_to({"message": message, "message_id": message_id})
            await asyncio.sleep(0.1)

        async def receive_streaming_response(communicator, expected_name):
            full_response = ""
            while True:
                try:
                    response = await communicator.receive_json_from(timeout=60)
                except asyncio.TimeoutError:
                    logger.error(
                        f"Timeout while waiting for message for {expected_name}")
                    break

                logger.debug(
                    f"Received message for {expected_name}: {response}")

                if response.get('type') == 'ping':
                    continue

                event = response.get('event')
                if event == 'on_parser_start':
                    full_response = ""
                elif event == 'on_parser_stream':
                    full_response += response.get('value', '')
                elif event == 'on_parser_end':
                    return full_response
                else:
                    return full_response

        async def send_and_receive_messages(communicator, username):
            messages = []
            for i in range(1, 6):
                logger.debug(f"Sending message {i + 1} for {username}")
                await send_message(communicator, "What is my name?", i + 1)
                response_text = await receive_streaming_response(communicator, username)
                if response_text:
                    messages.append(response_text)
                # wait for a bit to ensure response handling
                await asyncio.sleep(0.1)
            return messages

        # Send and receive messages for both users concurrently
        messages1, messages2 = await asyncio.gather(
            send_and_receive_messages(communicator1, 'abigail'),
            send_and_receive_messages(communicator2, 'zoey')
        )

        # Logging for debugging
        logger.debug(
            f"Messages for Abigail's session {self.session1.id}: {messages1}")
        logger.debug(
            f"Messages for Zoey's session {self.session2.id}: {messages2}")

        # Assertions for user1 (abigail)
        for i, response1_text in enumerate(messages1):
            self.assertIn("abigail", response1_text.lower(),
                          f"Iteration {i + 1}: Expected 'abigail' in response but got {response1_text}")
            self.assertNotIn("zoey", response1_text.lower(),
                             f"Iteration {i + 1}: Did not expect 'zoey' in response but got {response1_text}")

        # Assertions for user2 (zoey)
        for i, response2_text in enumerate(messages2):
            self.assertIn("zoey", response2_text.lower(),
                          f"Iteration {i + 1}: Expected 'zoey' in response but got {response2_text}")
            self.assertNotIn("abigail", response2_text.lower(),
                             f"Iteration {i + 1}: Did not expect 'abigail' in response but got {response2_text}")

        await communicator1.disconnect()
        await communicator2.disconnect()

    @staticmethod
    def run_test():
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            ConcurrentChatTest().test_concurrent_chat_sessions())


if __name__ == "__main__":
    ConcurrentChatTest.run_test()
