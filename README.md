# Anjali Alankaram

A production-ready premium women's fashion eCommerce platform built for startup scale.

## Architecture

- **Backend**: NestJS (Monolith) + Prisma ORM + PostgreSQL + Redis
- **Frontend**: Next.js 14 (App Router) + TailwindCSS + Zustand
- **Mobile**: Flutter + Riverpod
- **Deployment**: AWS EC2 with Docker Compose, Nginx reverse proxy

## Folder Structure

- `/backend` - NestJS REST API
- `/frontend` - Next.js Web Application
- `/mobile` - Flutter Mobile App
- `/infra` - Nginx config and AWS setup scripts
- `docker-compose.yml` - Local dev environment
- `docker-compose.prod.yml` - Production deployment environment

## Getting Started (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+

### Steps

1. **Start Services (DB & Redis)**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Backend Setup**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npx prisma migrate dev
   npm run start:dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Frontend runs on http://localhost:4000*
   *Backend runs on http://localhost:3000 (Swagger: /api/docs)*

4. **Mobile Setup**
   ```bash
   cd mobile
   flutter pub get
   flutter run
   ```

## Production Deployment (AWS EC2)

1. Provision an EC2 instance (t3.medium recommended)
2. Run `infra/aws/ec2-setup.sh` on the instance
3. Provision RDS (PostgreSQL) and ElastiCache (Redis)
4. Update `.env` variables on EC2
5. Run:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
