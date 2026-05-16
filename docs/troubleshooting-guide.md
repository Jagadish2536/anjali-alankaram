# Production Troubleshooting Guide

This guide helps you diagnose and fix common issues in your AWS ECS environment.

## 1. Viewing Application Logs
All containers ship logs directly to Amazon CloudWatch.
1. Go to **CloudWatch** -> **Log groups**.
2. Search for `/ecs/anjali-alankaram`.
3. Click on the Log Group. You will see streams prefixed with `backend/backend/` or `frontend/frontend/`.
4. Click a stream to view raw stdout/stderr logs from your Node.js apps.

## 2. ECS Deployment Circuit Breaker
If you push bad code (e.g., an app that crashes on startup), ECS handles this gracefully:
- The new container will fail to start.
- ECS will attempt to restart it a few times.
- If it continues failing, the **Circuit Breaker** triggers.
- ECS aborts the deployment and rolls back to the previous working version automatically.
- *Zero downtime is maintained during this failure.*

## 3. ECS Exec (Terminal Access)
If you need to SSH into a running container to debug (e.g., to run `npx prisma studio`):
1. Ensure you have the `session-manager-plugin` installed on your local machine.
2. Run the following AWS CLI command:
   ```bash
   aws ecs execute-command --cluster anjali-alankaram-cluster \
       --task <task-id> \
       --container backend \
       --interactive \
       --command "/bin/sh"
   ```

## 4. 5xx Errors from ALB
If the Load Balancer returns a 502/503/504 error:
- **502 Bad Gateway**: The container is crashing or returning invalid headers. Check CloudWatch logs.
- **503 Service Unavailable**: No healthy tasks are available. Check ECS -> Clusters -> Services -> Events to see why tasks are failing health checks.
- **504 Gateway Timeout**: The container is taking too long to respond (over 60 seconds). Ensure your database queries are optimized or increase the ALB timeout.

## 5. Database Connection Failures
If the backend logs show `PrismaClientInitializationError` or timeouts:
- Ensure the ECS Tasks are running in the correct public/private subnets.
- Ensure the `DATABASE_URL` in Secrets Manager matches the actual RDS endpoint.
- Verify the RDS Security Group (`anjali-alankaram-rds-sg`) allows inbound port 5432 from the ECS Tasks Security Group (`anjali-alankaram-ecs-tasks-sg`).
