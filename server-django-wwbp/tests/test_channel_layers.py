import os
import redis
import channels.layers
from asgiref.sync import async_to_sync
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = os.getenv('REDIS_PORT', '6379')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}" if ENVIRONMENT == 'local' else f"rediss://{REDIS_HOST}:{REDIS_PORT}"


def test_redis_connection():
    try:
        logger.info(f"REDIS_HOST: {REDIS_HOST}")
        logger.info(f"REDIS_PORT: {REDIS_PORT}")
        logger.info("Creating Redis client...")
        r = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            socket_connect_timeout=30,
            decode_responses=True,
            ssl=True if ENVIRONMENT == 'production' else False,
            socket_timeout=30
        )
        logger.info("Redis client created. Pinging...")
        if r.ping():
            logger.info("Connected to Redis successfully!")
    except redis.ConnectionError as e:
        logger.error(f"ConnectionError: Failed to connect to Redis: {e}")
    except redis.TimeoutError as e:
        logger.error(f"TimeoutError: Failed to connect to Redis: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")


def test_channel_layer():
    try:
        logger.info("Getting channel layer...")
        channel_layer = channels.layers.get_channel_layer()
        async_to_sync(channel_layer.send)('test_channel', {'type': 'hello'})
        logger.info("Message sent to test_channel.")
        response = async_to_sync(channel_layer.receive)('test_channel')
        logger.info(f"Received message: {response}")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        raise


if __name__ == "__main__":
    test_redis_connection()
    test_channel_layer()
