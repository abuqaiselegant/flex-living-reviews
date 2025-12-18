# 🔐 AWS Permissions Setup Guide

## Current Issue
Your AWS user `aq` needs additional permissions to deploy with Serverless Framework.

## Option 1: Use AWS Console (Recommended - 2 minutes)

### Step 1: Login to AWS Console
1. Go to: https://console.aws.amazon.com/iam/
2. Login with your AWS account

### Step 2: Attach Policies to User
1. Click on **"Users"** in the left sidebar
2. Click on user **"aq"**
3. Click **"Add permissions"** → **"Attach policies directly"**
4. Search and select these AWS managed policies:
   - ✅ **AdministratorAccess** (easiest - full access)
   
   OR if you want minimal permissions, select these:
   - ✅ **AWSLambda_FullAccess**
   - ✅ **IAMFullAccess**
   - ✅ **AmazonAPIGatewayAdministrator**
   - ✅ **AmazonDynamoDBFullAccess**
   - ✅ **CloudWatchLogsFullAccess**
   - ✅ **AWSCloudFormationFullAccess**

5. Click **"Add permissions"**

### Step 3: Verify Permissions
Run this command to verify:
```bash
aws iam get-user
```

### Step 4: Deploy Again
```bash
cd /Users/abuqais/Desktop/Journey2024/flex-living-reviews
export DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
cd infra
npx serverless deploy --stage dev
```

---

## Option 2: Create New User with Full Permissions

If you can't modify the existing user, create a new one:

### Step 1: Create New IAM User
1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click **"Users"** → **"Create user"**
3. Username: `serverless-deploy`
4. Check **"Provide user access to AWS Management Console"** (optional)

### Step 2: Attach AdministratorAccess Policy
1. Select **"Attach policies directly"**
2. Search and select **"AdministratorAccess"**
3. Click **"Next"** → **"Create user"**

### Step 3: Create Access Keys
1. Click on the new user `serverless-deploy`
2. Go to **"Security credentials"** tab
3. Click **"Create access key"**
4. Select **"Command Line Interface (CLI)"**
5. Click **"Create access key"**
6. **Copy** the Access Key ID and Secret Access Key

### Step 4: Configure New Credentials
```bash
aws configure --profile serverless-deploy
# Enter Access Key ID
# Enter Secret Access Key
# Region: us-east-1
# Output: json

# Use this profile for deployment
export AWS_PROFILE=serverless-deploy
```

---

## Option 3: Use Root Account (Not Recommended)

If you have root account access:
1. Login with root account
2. Create access keys for root
3. Configure AWS CLI with root credentials

⚠️ **Not recommended for production!**

---

## What Permissions Are Needed?

Serverless Framework needs these AWS services:
- **CloudFormation**: Create/update stacks
- **Lambda**: Deploy functions
- **API Gateway**: Create HTTP APIs
- **DynamoDB**: Create tables
- **IAM**: Create execution roles
- **CloudWatch**: Create log groups
- **S3**: Store deployment artifacts

---

## After Adding Permissions

Run this to deploy:
```bash
cd /Users/abuqais/Desktop/Journey2024/flex-living-reviews
./scripts/deploy-aws.sh dev
```

---

## Quick Test

After adding permissions, test with:
```bash
aws cloudformation describe-stacks --region us-east-1
```

If this works without errors, you're ready to deploy! 🚀
