import pika
import ssl
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the RabbitMQ connection parameters
rabbitmq_user = os.getenv('RABBITMQ_DEFAULT_USER', 'guest')
rabbitmq_password = os.getenv('RABBITMQ_DEFAULT_PASS', 'guest')
rabbitmq_host = os.getenv('RABBITMQ_HOST', 'host')
rabbitmq_port = int(os.getenv('RABBITMQ_PORT', '5672'))

credentials = pika.PlainCredentials(rabbitmq_user, rabbitmq_password)

# Create SSL context
context = ssl.create_default_context()

# Define connection parameters with SSL options
parameters = pika.ConnectionParameters(
    host=rabbitmq_host,
    port=rabbitmq_port,
    virtual_host='/',
    credentials=credentials,
    ssl_options=pika.SSLOptions(context)
)

try:
    logger.info('Trying to connect to RabbitMQ')
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    logger.info('Successfully connected to RabbitMQ')
    connection.close()
except Exception as e:
    logger.error(f'Failed to connect to RabbitMQ: {e}')
