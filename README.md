# Anjali Alankaram

A production-ready premium women's fashion eCommerce platform built for startup scale — with a full-featured admin dashboard, PWA support, Android APK, and rich customer experience.

🌐 **Live Website**: [anjalialankaram.com](https://anjalialankaram.com)

---

## ── Architecture Overview

| Layer | Technology |
|:---|:---|
| **Backend API** | NestJS (Monolithic REST) · Prisma ORM · PostgreSQL · Redis |
| **Frontend** | Next.js 14 (App Router) · TailwindCSS · Zustand |
| **Mobile** | Flutter · Riverpod + Android APK (PWA-based) |
| **Cloud** | AWS VPC · ALB · ECS Fargate (Spot) · RDS PostgreSQL · ElastiCache Redis · Route 53 · ACM · CloudWatch + SNS-Lambda alerting |

---

## ── Project Structure

```
├── /backend            # NestJS REST API, Prisma schema & migrations
├── /frontend           # Next.js Web Application (PWA-ready)
│   ├── /public
│   │   ├── manifest.json          # PWA manifest (name: Anjali Alankaram)
│   │   ├── sw.js                  # Service Worker (offline support)
│   │   ├── offline.html           # Branded offline/error page
│   │   └── AnjaliAlankaram.apk    # Android APK download
│   └── /src
│       ├── /app                   # Next.js App Router pages
│       │   ├── /admin             # Admin dashboard (products, orders, reviews, settings)
│       │   └── /...               # Customer-facing pages
│       ├── /components
│       │   └── ServiceWorkerRegistration.tsx  # SW registration client component
│       └── /store
│           └── useSettingsStore.ts            # Global admin settings store (Zustand)
├── /mobile             # Flutter Mobile App
├── /infrastructure     # Terraform cloud infrastructure orchestration
├── /nginx              # Nginx reverse proxy config
└── docker-compose.yml  # Local dev environment
```

---

## ── Feature Set

### 🛍️ Customer Features
- Product catalogue with variant system (size, colour, hex swatches)
- Image lightbox with swipe gestures
- Size guide modal (inches ↔ cm conversion)
- Wishlist, cart, and one-page checkout
- Razorpay online payment + Cash on Delivery
- Coupon & automatic offer discounts
- GST / shipping / COD charge calculation (admin-configured)
- Gift packaging add-on
- Product reviews — submit, star rating, verified-purchase badge
- Real-time active-viewer count on product pages
- Pincode delivery availability check
- Order tracking & history
- Google OAuth + OTP login
- PWA install prompt (Add to Home Screen)
- **Offline support** — branded offline page when network is unavailable

### ⚙️ Admin Dashboard (`/admin`)
- **Products** — create/edit with variants, images (S3 upload), size guide, video
- **Orders** — full order management, status updates, Shiprocket integration
- **Customers** — user list, details, order history
- **Reviews** — view all reviews with search/filter, delete with confirmation modal
- **Coupons** — create/disable discount codes
- **Offers** — auto-discount offer banners
- **Analytics** — sales charts, visitor stats, revenue overview
- **Settings** — full store configurator:
  - Store info, contact, address, business hours
  - Theme (primary colour, background, fonts, font size scale)
  - Homepage toggles: Marquee banner, **Customer Reviews Section**
  - Hero banner images (3-image collage upload)
  - Shipping, GST, COD, platform fee, gift packaging
  - Coupon & offer toggles
  - Maintenance mode
  - Notification preferences

### 📱 PWA & Android App
- Full PWA with `manifest.json` (`name: "Anjali Alankaram"`, maskable icons)
- Service Worker (`sw.js`) — cache-first for assets, network-first for navigation
- Branded offline HTML page (`offline.html`) with auto-retry on reconnect
- Android APK available for direct download at `/AnjaliAlankaram.apk`
- iOS install via Safari "Add to Home Screen"
- Apple Web App metadata (`apple-mobile-web-app-title`, `capable`, `status-bar-style`)

---

## ── Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Flutter SDK (for mobile only)

### Steps

1. **Start Database and Redis**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Configure & Start Backend**
   ```bash
   cd backend
   cp .env.example .env        # Fill in DB credentials and API keys
   npm install
   npx prisma db push          # Sync schema to local DB
   npm run start:dev
   ```
   API runs on: `http://localhost:3000`  
   Swagger Docs: `http://localhost:3000/api/docs`

3. **Configure & Start Frontend**
   ```bash
   cd ../frontend
   cp .env.local.example .env.local   # Set NEXT_PUBLIC_API_URL
   npm install
   npm run dev
   ```
   Frontend runs on: `http://localhost:4000`

4. **Mobile App (optional)**
   ```bash
   cd ../mobile
   flutter pub get
   flutter run
   ```

---

## ── Database Schema Notes

The backend uses **Prisma DB Push** (not migrations) in production — the `entrypoint.sh` runs `npx prisma db push --accept-data-loss=false` on every container start. This ensures new columns and tables are added automatically on deploy without any data loss.

Key recent schema additions to `StoreSettings`:
| Field | Type | Default | Purpose |
|:---|:---|:---|:---|
| `marqueeEnabled` | Boolean | `true` | Toggle homepage marquee banner |
| `reviewsEnabled` | Boolean | `true` | Toggle homepage reviews carousel |

---

## ── Infrastructure Sizing Tiers

| Tier | Target Concurrent Users | Monthly Cost | ECS Compute (Daytime) |
|:---|:---|:---|:---|
| **Tier 0** | ~100 | ₹4,000/mo | Desired: 1 · Min: 1 · Max: 1 |
| **Tier 1** | ~500 | ₹8,000/mo | Desired: 2 · Min: 1 · Max: 3 |
| **Tier 2** | ~1,000 | ₹12,000/mo | Desired: 3 · Min: 1 · Max: 6 |

> All tiers scale down to **1 task** between **11:00 PM – 10:00 AM IST** to reduce off-peak costs.

---

## ── Production Deployment (From Scratch)

### Step 1: AWS CLI Configuration
```bash
aws configure
# Enter Access Key, Secret Key, and region (default: ap-south-2)
```

### Step 2: Provision Infrastructure via Terraform
```bash
cd infrastructure
terraform init
terraform apply -var="tier=0"   # tier=0 / tier=1 / tier=2
```
> Terraform outputs Load Balancer DNS, ECR URLs, and Secrets Manager ARNs.  
> ECS tasks will fail initially — that's expected until Docker images are pushed.

### Step 3: Build & Push Docker Images to ECR
```bash
# Authenticate Docker with AWS ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account_id>.dkr.ecr.<region>.amazonaws.com

# Backend
docker build -t anjali-alankaram-backend ./backend
docker tag anjali-alankaram-backend:latest <account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-backend:latest
docker push <account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-backend:latest

# Frontend
docker build -t anjali-alankaram-frontend ./frontend
docker tag anjali-alankaram-frontend:latest <account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-frontend:latest
docker push <account_id>.dkr.ecr.<region>.amazonaws.com/anjali-alankaram-frontend:latest
```

### Step 4: Push Secrets to AWS Secrets Manager
```bash
# Fill production values in backend/.env and frontend/.env.local, then:
cd backend
npm run secrets:push
```

### Step 5: Force ECS Deployment
```bash
# Backend
aws ecs update-service --cluster anjali-alankaram-cluster \
  --service anjali-alankaram-backend-service \
  --force-new-deployment --region ap-south-2

# Frontend
aws ecs update-service --cluster anjali-alankaram-cluster \
  --service anjali-alankaram-frontend-service \
  --force-new-deployment --region ap-south-2
```

### Step 6: Database Schema Updates
Schema updates are applied **automatically on container start** via `entrypoint.sh → prisma db push`.  
For manual forced sync against a remote DB:
```bash
DATABASE_URL="postgresql://<user>:<pass>@<rds_endpoint>:5432/<db>?schema=public" npx prisma db push
```

---

## ── Alerts & Monitoring

- **CloudWatch + SNS**: Monitors ECS CPU/memory, RDS connections, ALB 5xx error rates
- **Lambda Alerting**: Triggers on threshold breach → sends branded **HTML emails** (SES) + **WhatsApp messages** (MSG91)

---

## ── Recent Changelog

| Date | Change |
|:---|:---|
| Jul 2026 | PWA name fixed to "Anjali Alankaram" on Android install & iOS home screen |
| Jul 2026 | Service Worker added — offline support with branded `offline.html` page |
| Jul 2026 | APK renamed to `AnjaliAlankaram.apk`, download link updated on homepage |
| Jul 2026 | Admin Reviews dashboard — view all, search, filter by rating, delete |
| Jul 2026 | Settings: `reviewsEnabled` toggle to show/hide homepage reviews carousel |
| Jul 2026 | Homepage reviews: theme color synced, product images fixed, 4–5★ filter only |
| Jul 2026 | Modal scroll-lock fixed (Size Guide, Payment Policy, Share, Address modals) |
