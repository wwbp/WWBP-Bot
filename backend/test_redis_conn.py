import os
import django
from django.conf import settings
import redis

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()


def test_redis_connection():
    try:
        print(
            f"Attempting to connect to Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        r = redis.Redis(host=settings.REDIS_HOST,
                        port=settings.REDIS_PORT, socket_connect_timeout=5)
        print("Redis client created.")
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
