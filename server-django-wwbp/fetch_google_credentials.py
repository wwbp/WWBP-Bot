import boto3
from botocore.exceptions import ClientError
import json
import os


def get_secret():
    secret_name = "google-credentials-json"
    region_name = "us-east-1"  # Replace with your actual region

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        # For a list of exceptions thrown, see
        # https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        raise e

    secret = get_secret_value_response['SecretString']
    return secret


# Fetch the secret and save it to a file
secret_json = get_secret()
credentials_path = '/app/google_credentials.json'

# Load the JSON string into a Python dictionary
secret_dict = json.loads(secret_json)

# Extract the actual credentials JSON string and load it again to a dictionary
credentials_dict = json.loads(secret_dict['google-credentials'])

# Save the dictionary as a properly formatted JSON file
with open(credentials_path, 'w') as f:
    json.dump(credentials_dict, f, indent=4)

# Set the environment variable to the path of the saved credentials file
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
