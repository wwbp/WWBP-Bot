import boto3
import logging
from django.conf import settings

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


def test_s3_access():
    try:
        s3 = boto3.client(
            's3', region_name=settings.AWS_S3_REGION_NAME)
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        response = s3.list_objects_v2(Bucket=bucket_name)

        if 'Contents' in response:
            logger.info(
                f"Successfully accessed S3 bucket {bucket_name}. Objects in bucket:")
            for obj in response['Contents']:
                logger.info(f" - {obj['Key']}")
        else:
            logger.info(f"S3 bucket {bucket_name} is empty or inaccessible.")

    except Exception as e:
        logger.error(f"Error accessing S3 bucket: {e}")


if __name__ == "__main__":
    test_s3_access()
