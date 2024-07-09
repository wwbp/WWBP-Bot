
# AWS Infrastructure Setup Guide

## AWS Account Setup

1. **Acquire Access to AWS**
   - Ensure you have appropriate access to the AWS account.

2. **Setup Custom Policy**
   - Create and assign a custom policy to the user.
   - Add permissions as required.

## DNS Setup

1. **Create Hosted Zone**
   - In Route 53, create a hosted zone for the domain.
   - **Note:** If the domain was bought outside AWS, set up the nameservers.

2. **Acquire Certificates**
   - In AWS Certificate Manager, acquire certificates for:
     - `domain.xyz`
     - `*.domain.xyz` (for subdomains)

## Backend Setup

1. **Create Application on Elastic Beanstalk**
   1. Create a new application.
   2. Create an environment under this application:
      - **Environment Type:** Web Server Environment
      - **Platform:** Docker
      - **Platform Version:** Latest recommended version
      - **Application Code:** Upload ZIP of the current codebase (ensure Dockerfile is included)
      - **Configuration Presets:** Single Instance (free tier eligible)
      - **Service Access:**
        - Use existing or create new roles (aws-elasticbeanstalk-service-role)
        - EC2 Key pair for instance access
        - EC2 Instance profile (aws-elasticbeanstalk-ec2-role)
      - **Networking, Database, and Tags:**
        - Setup VPC (use default or create new)
      - **Instance Traffic and Scaling:** Configure defaults as required
      - **Updates, Monitoring, and Logging:** Configure defaults as required
      - **Environment Properties:** Add all relevant environment variables required by the backend.

2. **Setup Database in RDS**
   - Choose appropriate settings (MySQL, set username and password, configure security groups).

3. **Setup Redis Instance through ElastiCache**
   - Configure default settings and ensure security group configurations for port 6379 and 6380.

4. **~~Setup Celery Worker~~**
   - ~~Create a new worker environment in Beanstalk with the same settings and environment variables as the backend.~~

5. **~~Setup RabbitMQ~~**
   - ~~Create a RabbitMQ broker in Amazon MQ.~~
   - ~~Update backend and Celery environment variables with RabbitMQ credentials.~~

6. **Note:**
   - Ensure environment variables are correct and wait for RDS instance to be ready before retrying environment setup if it fails.

## Frontend Setup

1. **Create S3 Bucket**
   - Name it the same as the domain being served.
   - Enable versioning and upload build files from React.

2. **Setup CloudFront**
   - **Origin Domain:** Point to the S3 bucket.
   - **Origin Access:** Create a new Origin Access Control (OAC) setting.
   - **Cache Behavior:** Use default settings and configure HTTP to HTTPS redirection.
   - **Settings:**
     - Alternate domain name
     - Custom SSL certificate
     - Default root object: index.html
   - **S3 Bucket Policy:** Update the S3 bucket policy with the CloudFront provided statement.

3. **Domain Mapping**
   - In Route 53, map the domain to the CloudFront distribution with an 'A' record.

4. **Error Pages Configuration**
   - Configure custom error responses in CloudFront for 403 errors to return `index.html`.

5. **API and WebSocket Setup**
   - In CloudFront distribution, create an origin pointing to the Elastic Beanstalk assigned load balancer.
   - Create behavior for `/api/*` and `/ws/*` to use EBLB orgin defined above

## Miscellaneous

1. **Handling Larger Payloads**
   - Configure AWS WAF to manage larger payloads:
     - In AWS WAF, select the load balancer's web ACL.
     - Modify the `SizeRestrictions_BODY` rule in `AWS-AWSManagedRulesCommonRuleSet` to "Count".

2. **Google Credentials for API services**
   - Store the credentials.json in AWS Secrets Manager
      - Download the credentials json from google cloud
      - Go to AWS Secrets Manager and create a new secret with value as credential.json
      - Update fetch google crediatials to Secret config: [fetch_google_credentials](backend/fetch_google_credentials.py)
   - Ensure that the IAM role associated with EB has permission to access the secret
3. **[EB Deployment Flake] “The following instances have not responded in the allowed command timeout time”**
   - NTP – Instances in your Elastic Beanstalk environment use Network Time Protocol (NTP) to synchronize the system clock. If instances are unable to communicate on UDP port 123, the clock may go out of sync, causing issues with Elastic Beanstalk health reporting. Ensure that your VPC security groups and network ACLs allow inbound and outbound UDP traffic on port 123 to avoid these issues.
      - Security Groups: Modify the security group associated with your Elastic Beanstalk environment to allow inbound and outbound UDP traffic on port 123.
      - Network ACLs: Ensure your network ACLs also allow this traffic. Add entries to allow UDP traffic on port 123 for both inbound and outbound rules.
