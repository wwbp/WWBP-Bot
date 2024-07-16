import channels.layers
from asgiref.sync import async_to_sync
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_channel_layers():
    try:
        logger.info("Getting channel layer...")
        channel_layer = channels.layers.get_channel_layer()
        async_to_sync(channel_layer.send)('test_channel', {'type': 'hello'})
        logger.info("Message sent to test_channel.")
        response = async_to_sync(channel_layer.receive)('test_channel')
        logger.info(f"Received message: {response}")
    except Exception as e:
        logger.error(f"An error occurred: {e}")


if __name__ == "__main__":
    test_channel_layers()
