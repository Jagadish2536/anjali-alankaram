# Anjali Alankaram

A production-ready premium women's fashion eCommerce platform built for startup scale.

## ── Architecture Overview

- **Backend**: NestJS Monolithic REST API + Prisma ORM + PostgreSQL + Redis
- **Frontend**: Next.js 14 (App Router) + TailwindCSS + Zustand
- **Mobile**: Flutter + Riverpod
- **Cloud Infrastructure**: AWS VPC, Application Load Balancer (ALB), ECS Fargate (with Spot capacity optimization), RDS PostgreSQL, ElastiCache Redis, Route 53, ACM (SSL), and CloudWatch SNS-Lambda alerting (WhatsApp + Email).

---

## ── Project Structure

```
├── /backend            # NestJS REST API & database migration files
├── /frontend           # Next.js Web Application
├── /mobile             # Flutter Mobile App
├── /infrastructure     # Terraform cloud infrastructure orchestration
├── docker-compose.yml  # Local dev environment
```

---

## ── Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Flutter SDK (for mobile)

### Steps

1. **Start Database and Redis Containers**
   From the root folder, run:
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Configure & Start Backend**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npx prisma migrate dev
   npm run start:dev
   ```
   *Backend API runs on: http://localhost:3000 (Swagger Docs: http://localhost:3000/api/docs)*

3. **Configure & Start Frontend**
   ```bash
   cd ../frontend
   cp .env.local.example .env.local
   npm install
   npm run dev
   ```
   *Frontend web application runs on: http://localhost:4000*

4. **Start Mobile App**
   ```bash
   cd ../mobile
   flutter pub get
   flutter run
   ```

---

## ── Infrastructure Sizing Tiers

The infrastructure uses a dynamic `tier` parameter in Terraform to configure sizing, scaling, and cost boundaries:

| Tier | Target Concurrent Users | Monthly Bill Limit | Compute Sizing (Daytime) |
| :--- | :--- | :--- | :--- |
| **Tier 0** | ~100 | **₹4,000 INR** | Desired: 1, Min: 1, Max: 1 (strictly single instance to save costs) |
| **Tier 1** | ~500 | **₹8,000 INR** | Desired: 2, Min: 1, Max: 3 |
| **Tier 2** | ~1,000 | **₹12,000 INR** | Desired: 3, Min: 1, Max: 6 |

*Note: In all tiers, instances scale down to exactly **1 task** (single instance) between **11:00 PM IST and 10:00 AM IST** to reduce off-peak hosting costs.*

---

## ── Production Deployment (From Scratch)

Follow these step-by-step guidelines to deploy the entire production stack onto AWS.

### Step 1: AWS CLI Configuration
Ensure your AWS credentials are set up on your machine.
```bash
aws configure
# Enter your Access Key, Secret Access Key, and region (default: ap-south-2)
```

### Step 2: Provision Infrastructure via Terraform
1. Navigate to the infrastructure folder:
   ```bash
   cd infrastructure
   ```
2. Initialize Terraform and apply the deployment:
   ```bash
   terraform init
   terraform apply -var="tier=0"   # Change to tier=1 or tier=2 based on your requirements
   ```
3. Once completed, Terraform will output your Load Balancer DNS, ECR URLs, and Secrets Manager ARNs.
   *Note: At this stage, ECS services will initially fail to start tasks because no Docker images exist in the ECR repositories yet. This is expected.*

### Step 3: Build & Push Docker Images to AWS ECR
1. Log in to AWS ECR using your Docker CLI (replace `<aws_account_id>` and `<region>`):
   ```bash
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com
   ```

2. Build, tag, and push the **Backend** image:
   ```bash
   # From root folder
   docker build -t anjali-alankaram-backend ./backend
   docker tag anjali-alankaram-backend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-backend:latest
   docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-backend:latest
   ```

3. Build, tag, and push the **Frontend** image:
   ```bash
   # From root folder
   docker build -t anjali-alankaram-frontend ./frontend
   docker tag anjali-alankaram-frontend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-frontend:latest
   docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-frontend:latest
   ```

### Step 4: Push Application Secrets to AWS Secrets Manager
The ECS Fargate containers pull environment variables (like API keys, SMTP configuration, MSG91 Auth, etc.) directly from AWS Secrets Manager.

1. Configure your local `backend/.env` and `frontend/.env.local` files with production values.
2. From the `/backend` folder, run the automated sync script to merge local secrets into AWS:
   ```bash
   npm run secrets:push
   ```
   *This script securely updates the AWS secrets payload without overwriting VPC/database endpoints.*

### Step 5: Force ECS Service Deployment
Now that ECR has images and Secrets Manager has keys, force ECS to run the containers:
```bash
# Redeploy Backend Service
aws ecs update-service --cluster anjali-alankaram-cluster --service anjali-alankaram-backend-service --force-new-deployment --region ap-south-2

# Redeploy Frontend Service
aws ecs update-service --cluster anjali-alankaram-cluster --service anjali-alankaram-frontend-service --force-new-deployment --region ap-south-2
```

### Step 6: Deploy Database Migrations in Production
To apply schema updates directly to the production RDS database:
```bash
# Locate the production DATABASE_URL inside AWS Secrets Manager, then run:
DATABASE_URL="postgresql://<db_username>:<db_password>@<rds_endpoint>:5432/<db_name>?schema=public" npx prisma migrate deploy
```

---

## ── Alerts & Monitoring

- **SNS & CloudWatch**: The setup automatically monitors container CPU/memory usage, RDS database connections, and ALB error rates.
- **Alert Lambdas**: Whenever thresholds are breached (e.g. database connections exceed 150 or CPU utilization spikes above 80%), Lambda alerts will trigger notifications via **branded HTML emails** (using Amazon SES) and **WhatsApp messages**.
