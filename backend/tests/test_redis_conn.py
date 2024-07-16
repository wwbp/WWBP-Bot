import os
import redis

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}" if ENVIRONMENT == 'local' else f"rediss://{REDIS_HOST}:{REDIS_PORT}"


def test_redis_connection():
    try:
        print(f"REDIS_HOST: {REDIS_HOST}")
        print(f"REDIS_PORT: {REDIS_PORT}")
        print("Creating Redis client...")
        r = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            socket_connect_timeout=30,
            decode_responses=True,
            ssl=True if ENVIRONMENT == 'production' else False,
            socket_timeout=30
        )
        print("Redis client created. Pinging...")
        if r.ping():
            print("Connected to Redis successfully!")
    except redis.ConnectionError as e:
        print(f"ConnectionError: Failed to connect to Redis: {e}")
    except redis.TimeoutError as e:
        print(f"TimeoutError: Failed to connect to Redis: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    test_redis_connection()
