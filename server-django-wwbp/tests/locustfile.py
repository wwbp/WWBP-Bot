from websocket import create_connection, WebSocketConnectionClosedException
from locust import HttpUser, TaskSet, task, between
import json
import ssl
import time
import random
import uuid
import base64

# Generate a key for the WebSocket handshake
key = base64.b64encode(uuid.uuid4().bytes).decode("utf-8").strip()


class ChatBehavior(TaskSet):
    token = None
    chat_session_id = None
    ws = None
    ws_audio = None
    username = None
    password = None

    def on_start(self):
        # Set frontend-like headers
        self.client.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        })

        # STEP 1: Get CSRF token
        with self.client.get("https://chatfriend.in/api/v1/csrf/", catch_response=True) as csrf_resp:
            if csrf_resp.status_code == 200:
                try:
                    csrf_data = csrf_resp.json()
                    csrf_token = csrf_data.get("csrfToken")
                    if csrf_token:
                        # Update both headers and cookies
                        self.client.headers.update({"X-CSRFToken": csrf_token})
                        self.client.cookies.set("csrftoken", csrf_token)
                        csrf_resp.success()
                    else:
                        csrf_resp.failure("No CSRF token in response")
                        return
                except Exception as e:
                    csrf_resp.failure(
                        "Failed to decode CSRF JSON: " + csrf_resp.text)
                    return
            else:
                csrf_resp.failure("Failed to get CSRF token")
                return

        # STEP 2: Register a new user with random credentials.
        self.username = "locust_test_" + str(uuid.uuid4())[:8]
        self.password = "password123"
        register_payload = {
            "username": self.username,
            "password": self.password,
            "role": "student",
            "preferred_name": self.username
        }
        with self.client.post("https://chatfriend.in/api/v1/register/", json=register_payload, catch_response=True) as reg_resp:
            if reg_resp.status_code in (200, 201):
                reg_resp.success()
            else:
                reg_resp.failure(
                    f"Registration failed for {self.username}: {reg_resp.text}")
                return

        # STEP 3: Login using the correct API URL
        login_payload = {"username": self.username, "password": self.password}
        # Disable redirects so that you get the raw response.
        with self.client.post("https://chatfriend.in/api/v1/login/", json=login_payload, catch_response=True, allow_redirects=False) as login_resp:
            if login_resp.status_code != 200:
                login_resp.failure(f"Login failed: {login_resp.text}")
                return
            try:
                login_data = login_resp.json()
            except Exception as e:
                print("Login response text:", login_resp.text)
                login_resp.failure("Failed to decode login JSON")
                return
            self.token = login_data.get("token")
            if not self.token:
                login_resp.failure(
                    "No token found in login response: " + login_resp.text)
                return
            login_resp.success()

        # Set Authorization header for subsequent requests and WebSocket connections.
        self.client.headers.update({"Authorization": f"Token {self.token}"})

        # STEP 4: Get modules (make sure the API endpoint uses the proper prefix)
        with self.client.get("https://chatfriend.in/api/v1/modules/", catch_response=True) as modules_resp:
            if modules_resp.status_code != 200:
                modules_resp.failure(
                    "Failed to get modules: " + modules_resp.text)
                return
            try:
                modules_list = modules_resp.json()
            except Exception as e:
                modules_resp.failure(
                    "Failed to decode modules JSON: " + modules_resp.text)
                return
            if not modules_list:
                modules_resp.failure("No modules available")
                return

        selected_module = None
        selected_task = None
        for _ in range(len(modules_list)):
            mod = random.choice(modules_list)
            with self.client.get(f"https://chatfriend.in/api/v1/modules/{mod['id']}/tasks/", catch_response=True) as tasks_resp:
                if tasks_resp.status_code == 200:
                    try:
                        tasks_list = tasks_resp.json()
                    except Exception as e:
                        continue
                    if tasks_list:
                        selected_module = mod
                        selected_task = random.choice(tasks_list)
                        break
        if not selected_module or not selected_task:
            modules_resp.failure("No modules with tasks available")
            return

        # STEP 5: Create a chat session
        chat_session_payload = {
            "module": selected_module["id"],
            "task": selected_task["id"]
        }
        with self.client.post("https://chatfriend.in/api/v1/chat_sessions/", json=chat_session_payload, catch_response=True) as chat_resp:
            if chat_resp.status_code == 201:
                try:
                    chat_data = chat_resp.json()
                    self.chat_session_id = chat_data.get("id")
                    if not self.chat_session_id:
                        chat_resp.failure(
                            "Chat session creation response missing id: " + chat_resp.text)
                        return
                except Exception as e:
                    chat_resp.failure(
                        "Failed to decode chat session JSON: " + chat_resp.text)
                    return
                chat_resp.success()
            else:
                chat_resp.failure(
                    "Chat session creation failed: " + chat_resp.text)
                return

        # STEP 6: Open WebSocket connections.
        ws_url = f"wss://chatfriend.in/ws/chat/{self.chat_session_id}/"
        ws_url_audio = f"wss://chatfriend.in/ws/audio/{self.chat_session_id}/"
        try:
            # Add the Authorization header to both connections
            self.ws = create_connection(
                ws_url,
                header={
                    "Origin": "https://chatfriend.in",
                    "Authorization": f"Token {self.token}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Connection": "Upgrade",
                    "Upgrade": "websocket",
                    "Sec-WebSocket-Key": key,
                    "Sec-WebSocket-Version": "13",
                },
                sslopt={"cert_reqs": ssl.CERT_NONE}
            )

            self.ws_audio = create_connection(
                ws_url_audio,
                header={
                    "Origin": "https://chatfriend.in",
                    "Authorization": f"Token {self.token}",
                    "User-Agent": "Mozilla/5.0",
                    "Sec-WebSocket-Key": key,
                    "Sec-WebSocket-Version": "13",
                },
                sslopt={"cert_reqs": ssl.CERT_NONE}
            )
        except Exception as e:
            print(
                f"[{self.username}] Error connecting to WebSocket with session id {self.chat_session_id} : {e}")
            self.ws = None
            self.ws_audio = None

    @task
    def chat(self):
        if not self.ws:
            return
        try:
            message = f"Hello, bot! This is {self.username}"
            message_data = {"message": message}
            self.ws.send(json.dumps(message_data))
            send_time = time.time()
            try:
                reply = self.ws.recv()
                elapsed = time.time() - send_time
                print(
                    f"[{self.username}] Received reply in {elapsed:.2f} sec: {reply}")
            except WebSocketConnectionClosedException:
                print(
                    f"[{self.username}] WebSocket connection closed unexpectedly.")
        except Exception as e:
            print(f"[{self.username}] Error during chat: {e}")

    @task
    def send_audio_message(self):
        if not self.ws_audio:
            return
        try:
            # Use a smaller payload for testing purposes.
            fake_audio_data = b"\x00\x01\x02" * 10  # Adjust as needed
            # Send as binary frame (opcode=2)
            self.ws_audio.send(fake_audio_data, opcode=2)
            print("Audio message sent.")

            # Optionally wait a short time before receiving a response
            time.sleep(0.5)
            try:
                response = self.ws_audio.recv()
                print(f"Audio WebSocket response: {response}")
            except WebSocketConnectionClosedException:
                print("Audio WebSocket connection closed unexpectedly.")
        except Exception as e:
            print(f"Error during audio message handling: {e}")
            # Attempt to reconnect the audio WebSocket on error
            self.reconnect_ws_audio()

    def reconnect_ws_audio(self):
        ws_url_audio = f"wss://chatfriend.in/ws/audio/{self.chat_session_id}/"
        try:
            self.ws_audio = create_connection(
                ws_url_audio,
                header={
                    "Origin": "https://chatfriend.in",
                    "Authorization": f"Token {self.token}",
                    "User-Agent": "Mozilla/5.0",
                    "Sec-WebSocket-Key": key,
                    "Sec-WebSocket-Version": "13",
                },
                sslopt={"cert_reqs": ssl.CERT_NONE}
            )
            print("Reconnected audio WebSocket.")
        except Exception as e:
            print(f"Failed to reconnect audio WebSocket: {e}")

    def on_stop(self):
        if self.ws:
            try:
                self.ws.close()
            except Exception:
                pass
        if self.ws_audio:
            try:
                self.ws_audio.close()
            except Exception:
                pass


class WebsiteUser(HttpUser):
    tasks = [ChatBehavior]
    wait_time = between(1, 5)
