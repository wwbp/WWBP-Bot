import redis
from django.conf import settings


def test_redis_connection():
    try:
        r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)
        r.ping()
        print("Connected to Redis successfully!")
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")


if __name__ == "__main__":
    test_redis_connection()
