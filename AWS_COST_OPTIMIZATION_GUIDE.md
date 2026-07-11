# AWS Cost Optimization & Reserved Instances Guide

This guide details the exact cost structures for the **Anjali Alankaram** infrastructure in the `ap-south-2` (Hyderabad) region and outlines the step-by-step instructions to purchase Reserved Instances (RIs) to save 30% to 50% on database and cache bills.

---

## 📊 Monthly Cost Breakdown (After Free Tier Expiration)

Once the 12-Month Free Tier expires, the estimated monthly billing is approximately **$81.81 USD (~₹6,830 INR)**.

| Service Component | Configuration Details | Monthly Cost (USD) | Monthly Cost (INR) |
| :--- | :--- | :--- | :--- |
| **RDS PostgreSQL Database** | `db.t4g.micro` (30 GB gp3 SSD storage) | $18.78 | ₹1,568.13 |
| **ElastiCache Redis Cache** | `cache.t4g.micro` (Single-Node cache) | $11.68 | ₹975.28 |
| **ECS Fargate Spot Tasks** | 1x Backend, 1x Frontend (0.5 vCPU, 1 GB RAM each) | $12.98 | ₹1,083.83 |
| **Public IPv4 Address Fees** | 4 public IPs (2 for Tasks, 2 for Load Balancer) | $14.60 | ₹1,219.10 |
| **Application Load Balancer** | ALB Base Cost + 1 LCU baseline traffic | $22.27 | ₹1,859.55 |
| **DNS & Logs (Route 53 & CW)** | Hosted Zone + S3 storage + CloudWatch Logs | $1.50 | ₹125.25 |
| **🔥 TOTAL ESTIMATED BILL** | | **$81.81** | **₹6,831.14** |

---

## ⏳ When to Purchase Reserved Instances
* **Do NOT buy them today**: Your database and cache are currently **100% free (₹0.00)** under your new account's 12-Month Free Tier.
* **Optimal Timing**: Purchase Reserved Instances in **Month 11 or 12** of your account's lifecycle. This allows you to utilize the full 12 months of free usage before making any financial commitments.

---

## 🛠️ Step 1: Purchasing RDS PostgreSQL Reserved Instance
To reserve a `db.t4g.micro` PostgreSQL database node for 1 year (No Upfront payment model, which bills a discounted rate monthly):

### Option A: Via AWS Management Console
1. Open the **[Amazon RDS Console](https://console.aws.amazon.com/rds/)**.
2. In the navigation pane, choose **Reserved instances**.
3. Choose **Purchase reserved DB instance**.
4. Configure the following values:
   * **Product info**: `PostgreSQL`
   * **DB instance class**: `db.t4g.micro`
   * **Multi-AZ deployment**: `No` (Single-AZ)
   * **Term**: `1 Year`
   * **Offering type**: `No Upfront` (you pay a low monthly fee with no initial cost)
5. Choose **Submit**.

### Option B: Via AWS CLI
Run the following command to purchase the reservation programmatically:
```bash
aws rds purchase-reserved-db-instances-offering \
    --reserved-db-instances-offering-id $(aws rds describe-reserved-db-instances-offerings --db-instance-class db.t4g.micro --duration 31536000 --product-description postgresql --multi-az false --offering-type "No Upfront" --region ap-south-2 --query "ReservedDBInstancesOfferings[0].ReservedDBInstancesOfferingId" --output text) \
    --reserved-db-instance-id "anjali-alankaram-db-reserved" \
    --region ap-south-2
```

---

## 🛠️ Step 2: Purchasing ElastiCache Redis Reserved Node
To reserve a `cache.t4g.micro` ElastiCache node for 1 year (No Upfront payment model):

### Option A: Via AWS Management Console
1. Open the **[Amazon ElastiCache Console](https://console.aws.amazon.com/elasticache/)**.
2. In the navigation pane, choose **Reserved Nodes**.
3. Choose **Purchase Reserved Nodes**.
4. Configure the following values:
   * **Product info**: `Redis`
   * **Node type**: `cache.t4g.micro`
   * **Term**: `1 Year`
   * **Offering type**: `No Upfront`
5. Choose **Purchase**.

### Option B: Via AWS CLI
Run the following command to purchase the cache reservation programmatically:
```bash
aws elasticache purchase-reserved-cache-nodes-offering \
    --reserved-cache-nodes-offering-id $(aws elasticache describe-reserved-cache-nodes-offerings --cache-node-type cache.t4g.micro --duration 31536000 --product-description redis --offering-type "No Upfront" --region ap-south-2 --query "ReservedCacheNodesOfferings[0].ReservedCacheNodesOfferingId" --output text) \
    --reserved-cache-node-id "anjali-alankaram-cache-reserved" \
    --region ap-south-2
```

---

## 📈 Summary of Savings
After purchasing these two 1-year reservations:
* **RDS Database** drops from ~$15.33/mo to **~$10.00/mo** (Saves ~₹450/month).
* **Redis Cache** drops from ~$11.68/mo to **~$7.50/mo** (Saves ~₹350/month).
* **Your Net Future Monthly Bill** drops from ~₹6,830 to **~₹6,030 / month**.
