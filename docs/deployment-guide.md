# Enterprise AWS Deployment Guide

This guide details the exact steps to provision your infrastructure and deploy Anjali Alankaram to AWS with zero downtime.

## Prerequisite Setup
1. **AWS Account**: Ensure you have an active AWS account.
2. **AWS CLI**: Install the AWS CLI and run `aws configure`. Input your IAM user credentials.
3. **Terraform**: Download and install Terraform (`>=1.5.0`). Add it to your system PATH.

## Step 1: Provision Infrastructure
1. Open a terminal and navigate to the `infrastructure` directory:
   ```bash
   cd c:\app\anjali-alankaram\infrastructure
   ```
2. Initialize Terraform:
   ```bash
   terraform init
   ```
3. Apply the infrastructure:
   ```bash
   terraform apply
   ```
   *Review the plan and type `yes`.* This will take ~10-15 minutes as it provisions the VPC, ECS clusters, RDS PostgreSQL, Redis, and ALB.

## Step 2: Configure Route53 DNS (Crucial)
If you provided `anjalialankaram.com` as the `domain_name` variable in Terraform, AWS created a Hosted Zone for you.
1. Log in to the AWS Console -> **Route53**.
2. Click on the Hosted Zone for `anjalialankaram.com`.
3. Note the 4 Name Servers (NS records) listed.
4. Log in to **Hostinger**. Navigate to your Domain Settings -> DNS / Nameservers.
5. Change the Hostinger Nameservers to the 4 AWS Route53 Nameservers.
6. *Wait 15-30 minutes for DNS propagation.* AWS ACM will automatically validate your SSL certificate once this completes.

## Step 3: Populate Secrets Manager
1. Go to the AWS Console -> **Secrets Manager**.
2. Find the secret named `anjali-alankaram-backend-env`.
3. Click "Retrieve Secret Value" and edit it.
4. Replace placeholder values (`TEMPORARY_PASSWORD_CHANGE_ME`) with your actual production secrets (Database passwords, MSG91 Keys, JWT Keys).

## Step 4: GitHub Secrets
1. Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add `AWS_ACCESS_KEY_ID`.
3. Add `AWS_SECRET_ACCESS_KEY`.

## Step 5: Trigger Deployments
1. Push your code to the `main` branch.
2. Navigate to the **Actions** tab in GitHub.
3. The `Deploy Backend` workflow will automatically trigger:
   - It builds the image.
   - Pushes to Amazon ECR.
   - **Runs Database Migrations via a secure ephemeral ECS Task**.
   - Initiates a rolling update of the web service.
4. The `Deploy Frontend` workflow will trigger identically.

**Congratulations! Your Enterprise SaaS is now live on AWS.**
