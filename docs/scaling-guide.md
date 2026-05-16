# AWS Scaling & Cost Optimization Guide

Your architecture is built to start small and scale infinitely. Here is how to manage traffic spikes and control costs.

## Phase 1: Startup Mode (Current Setup)
**Estimated Cost: ₹6k–₹10k / month**
- **Compute**: ECS Fargate. Tasks run in public subnets with public IPs. (Saves ~$30/mo by avoiding NAT Gateways). `desired_count` is 1 for both frontend and backend.
- **Database**: RDS PostgreSQL `db.t4g.micro` (Single-AZ).
- **Cache**: ElastiCache Redis `cache.t4g.micro`.

## Phase 2: High Availability (SME Mode)
When your store starts seeing consistent daily sales, you need redundancy.
1. **ECS Replication**: Go to Terraform `infrastructure/modules/ecs/main.tf` and change `desired_count = 2` for both frontend and backend services. This ensures zero downtime even if an underlying AWS server crashes.
2. **RDS Multi-AZ**: In `infrastructure/modules/rds/main.tf`, change `multi_az = true`. AWS will synchronously replicate your database to another availability zone. If the primary crashes, failover takes ~60 seconds.
*Cost will approximately double (~₹15k–₹20k/month).*

## Phase 3: Enterprise Auto-Scaling
When you experience massive traffic spikes (e.g., Diwali sales), you need dynamic scaling.

1. **ECS Target Tracking Auto Scaling**:
   Add Application Auto Scaling to your Terraform scripts to automatically increase the `desired_count` based on CPU usage.
   ```hcl
   resource "aws_appautoscaling_target" "backend" {
     max_capacity       = 10
     min_capacity       = 2
     resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
     scalable_dimension = "ecs:service:DesiredCount"
     service_namespace  = "ecs"
   }
   
   resource "aws_appautoscaling_policy" "backend_cpu" {
     name               = "backend-cpu-scaling"
     policy_type        = "TargetTrackingScaling"
     resource_id        = aws_appautoscaling_target.backend.resource_id
     scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
     service_namespace  = aws_appautoscaling_target.backend.service_namespace

     target_tracking_scaling_policy_configuration {
       predefined_metric_specification {
         predefined_metric_type = "ECSServiceAverageCPUUtilization"
       }
       target_value = 75.0
     }
   }
   ```
2. **Read Replicas**: If your database maxes out on CPU, configure RDS Read Replicas and point your Prisma `read` clients to them.
3. **CloudFront CDN**: Place AWS CloudFront in front of your ALB to aggressively cache Next.js static assets and product images, drastically reducing load on your Fargate containers.
