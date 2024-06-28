
# CI/CD Documentation

Set up GitHub Actions for continuous integration and continuous deployment (CI/CD) of your backend and frontend applications to AWS.

## Creating a Role for GitHub in AWS

To allow GitHub Actions to deploy your application to AWS, you need to create a role that GitHub can assume to perform actions on your AWS account.

### Steps to Create a Role for GitHub

1. **Log in to AWS Management Console:**
   - Go to the AWS Management Console.
   - Navigate to the IAM (Identity and Access Management) service.

2. **Create a New Role:**
   - In the IAM dashboard, click on "Roles" in the left sidebar.
   - Click on the "Create role" button.

3. **Select Trusted Entity:**
   - Choose "Web identity" as the trusted entity type.
   - Select "GitHub" from the list of providers.
   - For "Provider URL," enter `https://token.actions.githubusercontent.com`.
   - Click "Next: Permissions".

4. **Attach Policies:**
   - Attach the necessary policies that define the permissions the role will have. Common policies include:
     - `AmazonS3FullAccess`: For accessing S3 buckets.
     - `AWSCloudFrontFullAccess`: For managing CloudFront distributions.
     - `AWSElasticBeanstalkFullAccess`: For managing Elastic Beanstalk environments.
     - `AmazonRDSFullAccess`: For accessing RDS databases.
     - `AmazonEC2FullAccess`: For managing EC2 instances.

5. **Name and Review Role:**
   - Give your role a meaningful name, such as `GitHubActionsDeployRole`.
   - Review the role configuration and click "Create role".

6. **Update Trust Policy:**
   - After creating the role, navigate to the role's "Trust relationships" tab.
   - Click on "Edit trust policy" and replace the existing policy with the following:

     ```json
     {
       "Version": "2024-06-27",
       "Statement": [
         {
           "Effect": "Allow",
           "Principal": {
             "Federated": "arn:aws:iam::YOUR_AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
           },
           "Action": "sts:AssumeRoleWithWebIdentity",
           "Condition": {
             "StringEquals": {
               "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
               "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME:ref:refs/heads/main"
             }
           }
         }
       ]
     }
     ```

     - Replace `YOUR_AWS_ACCOUNT_ID` with your actual AWS account ID.
     - Replace `YOUR_GITHUB_USERNAME` with your GitHub username.
     - Replace `YOUR_REPOSITORY_NAME` with your repository name.

7. **Save and Use the Role:**
   - Save the updated trust policy.
   - Use the ARN of the created role in your GitHub Actions workflows to configure AWS credentials.

### Example ARN Usage in GitHub Actions

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/GitHubActionsDeployRole
    aws-region: us-west-2
```

## Setting GitHub Action Secrets

1. **Navigate to your GitHub repository:**
   - Go to your repository on GitHub.
   - Click on the `Settings` tab.
   - In the left sidebar, click on `Secrets and variables` and then `Actions`.

2. **Add the following secrets:**
   - `AWS_ACCOUNT_ID`: Your AWS account ID.
   - `AWS_ROLE_NAME`: The name of the role to assume for deployments.
   - `AWS_BACKEND_APPLICATION_NAME`: The name of your Elastic Beanstalk backend application.
   - `AWS_BACKEND_PRODUCTION_ENVIRONMENT_NAME`: The name of your Elastic Beanstalk production environment for the backend.
   - `AWS_CELERY_PRODUCTION_ENVIRONMENT_NAME`: The name of your Elastic Beanstalk production environment for the Celery worker.
   - `AWS_S3_BUCKET_NAME_PRODUCTION_FRONTEND`: The name of your S3 bucket for the production frontend.
   - `AWS_CLOUDFRONT_PRODUCTION_DISTRIBUTION_ID`: The ID of your CloudFront distribution for the production frontend.

## Backend Deployment Workflow

Create a file named `.github/workflows/deploy-backend.yml` in your repository.

1. **Workflow Name and Trigger**
   - `name: Deploy Backend and Celery to Production`: The name of the workflow.
   - `on: push: branches: - main`: This workflow triggers on pushes to the `main` branch.

2. **Permissions**
   - `permissions: id-token: write, contents: read`: Grants the necessary permissions for the workflow.

3. **Jobs**
   - `jobs: deploy: runs-on: ubuntu-latest`: Specifies the job named `deploy` that runs on the latest Ubuntu environment.

4. **Steps**
   - **Checkout Code**

     ```yaml
     - name: Checkout code
       uses: actions/checkout@v4
     ```

   - **Configure AWS Credentials**

     ```yaml
     - name: Configure AWS credentials
       uses: aws-actions/configure-aws-credentials@v4
       with:
         role-to-assume: arn:aws:iam::\${{ secrets.AWS_ACCOUNT_ID }}:role/\${{ secrets.AWS_ROLE_NAME }}
         aws-region: us-west-2
     ```

     - Configures the AWS credentials using the provided role and region.

   - **Install AWS Elastic Beanstalk CLI**

     ```yaml
     - name: Install AWS Elastic Beanstalk CLI
       run: |
         pip install awsebcli
     ```

     - Installs the AWS Elastic Beanstalk CLI.

   - **Deploy Django to Elastic Beanstalk**

     ```yaml
     - name: Deploy Django to Elastic Beanstalk
       run: |
         cd backend
         eb init -p "Docker running on 64bit Amazon Linux 2023" \${{ secrets.AWS_BACKEND_APPLICATION_NAME }} --region us-east-1
         eb use \${{ secrets.AWS_BACKEND_PRODUCTION_ENVIRONMENT_NAME }}
         cp Dockerfile.web Dockerfile
         eb deploy --timeout 30
     ```

     - Initializes and deploys the Django application to Elastic Beanstalk. It uses Docker and ensures the correct environment is selected.

   - **Deploy Celery to Elastic Beanstalk (Commented)**

     ```yaml
     # - name: Deploy Celery to Elastic Beanstalk
     #   run: |
     #     cd backend
     #     eb init -p "Docker running on 64bit Amazon Linux 2023" \${{ secrets.AWS_BACKEND_APPLICATION_NAME }} --region us-east-1
     #     eb use \${{ secrets.AWS_CELERY_PRODUCTION_ENVIRONMENT_NAME }}
     #     cp Dockerfile.worker Dockerfile
     #     eb deploy --timeout 30
     ```

     - This section, when uncommented, deploys the Celery worker to Elastic Beanstalk similarly to the Django deployment.

## Frontend Deployment Workflow

Create a file named `.github/workflows/deploy-frontend.yml` in your repository.

1. **Workflow Name and Trigger**
   - `name: Deploy Frontend to Production`: The name of the workflow.
   - `on: push: branches: - main`: This workflow triggers on pushes to the `main` branch.

2. **Permissions**
   - `permissions: id-token: write, contents: read`: Grants the necessary permissions for the workflow.

3. **Jobs**
   - `jobs: deploy: runs-on: ubuntu-latest`: Specifies the job named `deploy` that runs on the latest Ubuntu environment.

4. **Steps**
   - **Checkout Code**

     ```yaml
     - name: Checkout code
       uses: actions/checkout@v4
     ```

   - **Set up Node.js**

     ```yaml
     - name: Set up Node.js
       uses: actions/setup-node@v4
       with:
         node-version: "22"
     ```

   - **Install Dependencies**

     ```yaml
     - name: Install dependencies
       run: |
         cd frontend/app
         npm install
     ```

   - **Build Frontend**

     ```yaml
     - name: Build frontend
       env:
         REACT_APP_API_URL: https://gritcoach.ai/api/v1
         CI: false
       run: |
         cd frontend/app
         npm run build
     ```

     - Builds the frontend application. The `REACT_APP_API_URL` and `CI` environment variables are set for the build.

   - **Configure AWS Credentials**

     ```yaml
     - name: Configure AWS credentials
       uses: aws-actions/configure-aws-credentials@v4
       with:
         role-to-assume: arn:aws:iam::\${{ secrets.AWS_ACCOUNT_ID }}:role/\${{ secrets.AWS_ROLE_NAME }}
         aws-region: us-west-2
     ```

     - Configures the AWS credentials using the provided role and region.

   - **Sync S3 Bucket**

     ```yaml
     - name: Sync S3 bucket
       run: |
         aws s3 rm s3://\${{ secrets.AWS_S3_BUCKET_NAME_PRODUCTION_FRONTEND }} --recursive
         aws s3 sync frontend/app/build/ s3://\${{ secrets.AWS_S3_BUCKET_NAME_PRODUCTION_FRONTEND }} --delete
     ```

     - Syncs the built frontend files to the S3 bucket, after draining the bucket.

   - **Invalidate CloudFront Cache**

     ```yaml
     - name: Invalidate CloudFront cache
       run: |
         aws cloudfront create-invalidation --distribution-id \${{ secrets.AWS_CLOUDFRONT_PRODUCTION_DISTRIBUTION_ID }} --paths "/*"
     ```

     - Invalidates the CloudFront cache to ensure the latest frontend files are served.
