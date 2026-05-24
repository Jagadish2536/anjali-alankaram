# ---------------------------------------------------------
# ECS Module - main.tf
# ---------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = var.tags
}

# --- CloudWatch Logs ---
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 30
  tags              = var.tags
}

# --- ECR Repositories ---
resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}-frontend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  tags = var.tags
}

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
  tags = var.tags
}

# --- Backend Task Definition ---
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024  # Tier 1: 1 vCPU (was 0.5)
  memory                   = 2048  # Tier 1: 2 GB (was 1 GB)
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name         = "backend"
      image        = "${aws_ecr_repository.backend.repository_url}:latest"
      essential    = true
      portMappings = [{ containerPort = 3000, hostPort = 3000 }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }
      environment = [
        { name = "PORT", value = "3000" },
        { name = "NODE_ENV", value = "production" },
        { name = "AWS_S3_BUCKET", value = var.s3_bucket_name },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "UPLOAD_DRIVER", value = "s3" }
      ]
      secrets = [
        { name = "JWT_SECRET", valueFrom = "${var.secrets_arn}:JWT_SECRET::" },
        { name = "DATABASE_URL", valueFrom = "${var.secrets_arn}:DATABASE_URL::" },
        { name = "REDIS_HOST", valueFrom = "${var.secrets_arn}:REDIS_HOST::" },
        { name = "REDIS_PORT", valueFrom = "${var.secrets_arn}:REDIS_PORT::" },
        { name = "REDIS_PASSWORD", valueFrom = "${var.secrets_arn}:REDIS_PASSWORD::" },
        { name = "JWT_ACCESS_EXPIRES", valueFrom = "${var.secrets_arn}:JWT_ACCESS_EXPIRES::" },
        { name = "MSG91_AUTH_KEY", valueFrom = "${var.secrets_arn}:MSG91_AUTH_KEY::" },
        { name = "MSG91_TEMPLATE_ID", valueFrom = "${var.secrets_arn}:MSG91_TEMPLATE_ID::" },
        { name = "GOOGLE_CLIENT_ID", valueFrom = "${var.secrets_arn}:GOOGLE_CLIENT_ID::" },
        { name = "RAZORPAY_KEY_ID", valueFrom = "${var.secrets_arn}:RAZORPAY_KEY_ID::" },
        { name = "RAZORPAY_KEY_SECRET", valueFrom = "${var.secrets_arn}:RAZORPAY_KEY_SECRET::" },
        { name = "RAZORPAY_WEBHOOK_SECRET", valueFrom = "${var.secrets_arn}:RAZORPAY_WEBHOOK_SECRET::" },
        { name = "SHIPROCKET_EMAIL", valueFrom = "${var.secrets_arn}:SHIPROCKET_EMAIL::" },
        { name = "SHIPROCKET_PASSWORD", valueFrom = "${var.secrets_arn}:SHIPROCKET_PASSWORD::" },
        { name = "FIREBASE_SERVICE_ACCOUNT_BASE64", valueFrom = "${var.secrets_arn}:FIREBASE_SERVICE_ACCOUNT_BASE64::" },
        { name = "RATE_LIMIT_REQUESTS", valueFrom = "${var.secrets_arn}:RATE_LIMIT_REQUESTS::" },
        { name = "ALLOWED_ORIGINS", valueFrom = "${var.secrets_arn}:ALLOWED_ORIGINS::" }
      ]
    }
  ])
  tags = var.tags
}

# --- Frontend Task Definition ---
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024  # Tier 1: 1 vCPU (was 0.5)
  memory                   = 2048  # Tier 1: 2 GB (was 1 GB)
  execution_role_arn       = var.ecs_execution_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name         = "frontend"
      image        = "${aws_ecr_repository.frontend.repository_url}:latest"
      essential    = true
      portMappings = [{ containerPort = 4000, hostPort = 4000 }]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }
      environment = [
        { name = "PORT", value = "4000" },
        { name = "NODE_ENV", value = "production" }
      ]
    }
  ])
  tags = var.tags
}

# --- Backend Service ---
resource "aws_ecs_service" "backend" {
  name                   = "${var.project_name}-backend-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.backend.arn
  desired_count          = 2  # Tier 1: 2 tasks minimum (redundancy + zero-downtime deploys)
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets          = var.public_subnets
    security_groups  = [var.ecs_tasks_sg_id]
    assign_public_ip = true # Required for Fargate tasks in public subnets without NAT Gateway
  }

  load_balancer {
    target_group_arn = var.backend_target_group_arn
    container_name   = "backend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller { type = "ECS" }
  tags = var.tags
}

# --- Frontend Service ---
resource "aws_ecs_service" "frontend" {
  name                   = "${var.project_name}-frontend-service"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.frontend.arn
  desired_count          = 2  # Tier 1: 2 tasks minimum
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets          = var.public_subnets
    security_groups  = [var.ecs_tasks_sg_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = 4000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller { type = "ECS" }
  tags = var.tags
}

# --- CloudWatch Alarms ---
resource "aws_cloudwatch_metric_alarm" "backend_cpu" {
  alarm_name          = "${var.project_name}-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors backend CPU utilization"
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

resource "aws_cloudwatch_metric_alarm" "backend_memory" {
  alarm_name          = "${var.project_name}-backend-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors backend Memory utilization"
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }
}

# ---------------------------------------------------------
# Tier 1: Application Auto Scaling
# Backend: scales 2→4 tasks when CPU > 60%, scales in when CPU < 40%
# Frontend: scales 2→4 tasks when CPU > 70%
# ---------------------------------------------------------

# --- Backend Auto Scaling ---
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 4
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu_scale_out" {
  name               = "${var.project_name}-backend-cpu-scale-out"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60.0  # scale up when CPU > 60%, scale in when < 40%
    scale_in_cooldown  = 300   # wait 5 min before scaling in (avoids flapping)
    scale_out_cooldown = 60    # scale out quickly under load
  }
}

resource "aws_appautoscaling_policy" "backend_memory_scale_out" {
  name               = "${var.project_name}-backend-memory-scale-out"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 75.0  # scale up when memory > 75%
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# --- Frontend Auto Scaling ---
resource "aws_appautoscaling_target" "frontend" {
  max_capacity       = 4
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "frontend_cpu_scale_out" {
  name               = "${var.project_name}-frontend-cpu-scale-out"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
