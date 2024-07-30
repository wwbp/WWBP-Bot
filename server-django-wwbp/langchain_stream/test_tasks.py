# from botocore.exceptions import NoCredentialsError, PartialCredentialsError
# import logging
# import boto3
# # from langchain_stream.tasks import save_message_to_transcript
# import os
# # import django
# # from django.conf import settings

# # # Set the environment variable for the settings module
# # os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# # # Initialize Django
# # django.setup()


# # # Replace these values with actual ones from your database
# # session_id = 1
# # message_id = "test_message"
# # user_message = "This is a test user message."
# # bot_message = "This is a test bot message."
# # audio_bytes = b"test audio bytes"

# # # Call the function
# # save_message_to_transcript(session_id, message_id, user_message,
# #                            bot_message, has_audio=True, audio_bytes=audio_bytes)


# # Configure logging
# logging.basicConfig(level=logging.DEBUG)
# logger = logging.getLogger(__name__)

# # AWS S3 Configuration
# AWS_S3_REGION_NAME = 'us-east-1'
# AWS_STORAGE_BUCKET_NAME = 'gritcoach-dev-data'


# def get_file_streams(file_paths):
#     file_streams = []
#     try:
#         s3 = boto3.client('s3', region_name=AWS_S3_REGION_NAME)
#         for file_path in file_paths:
#             logger.debug(f"Processing file path: {file_path}")
#             if file_path.startswith('s3://'):
#                 key = file_path[5:].split('/', 1)[-1]
#                 local_path = os.path.join('/tmp', key.split('/')[-1])
#                 try:
#                     logger.debug(
#                         f"Downloading from bucket: {AWS_STORAGE_BUCKET_NAME}, key: {key} to {local_path}")
#                     s3.download_file(AWS_STORAGE_BUCKET_NAME, key, local_path)
#                     file_streams.append(open(local_path, 'rb'))
#                 except Exception as s3_error:
#                     logger.error(f"Error downloading from S3: {s3_error}")
#                     continue
#             else:
#                 try:
#                     logger.debug(f"Opening local file: {file_path}")
#                     file_streams.append(open(file_path, 'rb'))
#                 except Exception as local_file_error:
#                     logger.error(
#                         f"Error opening local file: {local_file_error}")
#                     continue
#     except (NoCredentialsError, PartialCredentialsError) as e:
#         logger.error(f"AWS credentials error: {e}")
#         return []
#     except Exception as e:
#         logger.error(f"Error retrieving file streams: {e}")
#         return []

#     return file_streams


# def main():
#     # Test file paths (add your S3 file paths and local file paths here)
#     file_paths = [
#         's3://gritcoach-dev-data/data/upload/driving-license.pdf',
#         's3://gritcoach-dev-data/data/upload/Hashing_II.pdf'
#     ]

#     # Retrieve file streams
#     file_streams = get_file_streams(file_paths)
#     logger.debug(f"Retrieved {len(file_streams)} file streams.")

#     # Print file contents to verify
#     for file_stream in file_streams:
#         logger.debug(f"Reading contents of file: {file_stream.name}")
#         try:
#             content = file_stream.read().decode('utf-8')
#             logger.debug(f"File content:\n{content}")
#         except Exception as e:
#             logger.error(f"Error reading file: {e}")
#         finally:
#             file_stream.close()


# if __name__ == "__main__":
#     main()

import boto3
import PyPDF2
from urllib.parse import urlparse

# Initialize S3 client
s3_client = boto3.client('s3')

# Define the list of S3 URLs
urls = [
    'https://gritcoach-dev-data.s3.us-east-1.amazonaws.com/data/upload/driving-license.pdf',
    'https://gritcoach-dev-data.s3.us-east-1.amazonaws.com/data/upload/Hashing_II.pdf'
]

# Function to extract bucket name and key from URL


def extract_bucket_and_key(url):
    parsed_url = urlparse(url)
    bucket_name = parsed_url.netloc.split('.')[0]
    key = parsed_url.path.lstrip('/')
    return bucket_name, key


# Download files from S3
for url in urls:
    bucket_name, key = extract_bucket_and_key(url)
    file_path = f'/tmp/{key.split("/")[-1]}'
    s3_client.download_file(bucket_name, key, file_path)

    # Read the PDF file
    with open(file_path, 'rb') as file:
        try:
            reader = PyPDF2.PdfReader(file)
            num_pages = len(reader.pages)
            text = ''
            for page in range(num_pages):
                text += reader.pages[page].extract_text()
            print(f"Contents of {file_path}:\n{text}\n")
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
