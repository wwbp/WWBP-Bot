import os
import django
from django.conf import settings
import redis

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()


def test_redis_connection():
    try:
        print(f"REDIS_HOST: {settings.REDIS_HOST}")
        print(f"REDIS_PORT: {settings.REDIS_PORT}")
        print("Creating Redis client...")
        r = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            socket_connect_timeout=10,
            socket_timeout=10
        )
        print("Redis client created. Pinging...")
        response = r.ping()
        print("Connected to Redis successfully! Ping response:", response)
    except redis.ConnectionError as e:
        print(f"ConnectionError: Failed to connect to Redis: {e}")
    except redis.TimeoutError as e:
        print(f"TimeoutError: Failed to connect to Redis: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    test_redis_connection()
