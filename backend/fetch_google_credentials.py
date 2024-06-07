import boto3
from botocore.exceptions import ClientError
import json


def get_secret():
    secret_name = "google-credentials-json"
    region_name = "us-east-1"

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
credentials_path = 'google_credentials.json'

# Parse the JSON string to a dictionary
credentials_dict = json.loads(secret_json)

# Save the dictionary as a properly formatted JSON file
with open(credentials_path, 'w') as f:
    json.dump(credentials_dict, f, indent=4)
