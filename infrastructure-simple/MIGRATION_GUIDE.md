# Step-by-Step Migration Guide to Simple EC2 Infrastructure

This guide outlines the exact steps to provision your new lightweight EC2 infrastructure (~₹1,430 / month bill target), copy your database data, and cutover DNS with **5 to 15 minutes of off-peak downtime**.

---

## 🚀 Step 1: Provision the New EC2 Server (0 Minutes Downtime)

1. Open your terminal and navigate to the new infrastructure directory:
   ```bash
   cd infrastructure-simple
   ```

2. Initialize Terraform and check the plan:
   ```bash
   terraform init
   terraform plan
   ```

3. Provision the EC2 instance, Elastic IP, Security Group, and daily snapshot policy:
   ```bash
   terraform apply -auto-approve
   ```

4. Note the output **Elastic IP** (e.g. `13.127.x.x`). Your old live website remains 100% online while you set up the new server.

---

## 📦 Step 2: Initial Setup on the New Server (0 Minutes Downtime)

1. SSH into your new EC2 server:
   ```bash
   ssh -i ~/.ssh/anjali-ec2-key.pem ubuntu@<YOUR_ELASTIC_IP>
   ```

2. Clone your GitHub repository into `/app`:
   ```bash
   cd /app
   git clone https://github.com/Jagadish2536/anjali-alankaram.git .
   ```

3. Create the production `.env` file for backend inside `/app/backend/.env`:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL="postgresql://postgres:AnjaliAlankaram2026Secure@postgres:5432/anjali_alankaram?schema=public"
   REDIS_HOST="redis"
   REDIS_PORT=6379
   
   # External API Keys (S3, Razorpay, MSG91, Shiprocket)
   AWS_REGION=ap-south-2
   AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
   AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
   AWS_S3_BUCKET_NAME=anjali-alankaram-assets
   ```

4. Launch production containers:
   ```bash
   docker compose -f docker-compose.production.yml up -d --build
   ```

---

## 🗄️ Step 3: Database Data Transfer (5 to 10 Minutes Downtime)

*Perform this step during low-traffic hours (e.g. 2:00 AM).*

1. Dump existing database data from RDS / current setup:
   ```bash
   pg_dump -h <OLD_RDS_HOST> -U postgres -d anjali_alankaram -F c -b -v -f /tmp/backup_production.dump
   ```

2. Restore the dump into your new PostgreSQL container:
   ```bash
   docker exec -i anjali_postgres pg_restore -U postgres -d anjali_alankaram -v /tmp/backup_production.dump
   ```

---

## 🌐 Step 4: SSL Certificate Setup & DNS Cutover (1 to 2 Minutes)

1. Set up free Let's Encrypt SSL certificate on EC2 using Certbot:
   ```bash
   sudo certbot --nginx -d anjalialankaram.com -d www.anjalialankaram.com
   ```

2. Update your GitHub Repository Secrets for Auto-Deployments:
   - Go to **GitHub Repo → Settings → Secrets and variables → Actions**.
   - Set `EC2_HOST` = Your Elastic IP address.
   - Set `EC2_SSH_KEY` = Your SSH Private Key (`.pem` file content).

3. Point Route 53 DNS records to your Elastic IP address via Terraform or AWS Console.

---

## 🔒 Safety & Emergency Rollback Plan

If you ever need to revert to your previous setup for any reason:
1. Open **Route 53 Console**.
2. Change the `A` record back to your Application Load Balancer (ALB) URL.
3. Your old ECS infrastructure will resume handling traffic within 60 seconds.
