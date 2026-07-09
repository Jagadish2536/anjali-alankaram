# ---------------------------------------------------------
# Cost Optimization — Anjali Alankaram
#
# Applied savings:
#  1. Fargate SPOT for frontend (-70% on frontend compute)
#  2. ECR lifecycle policy — keep only last 10 images
#  3. Scheduled scaling — reduce to 1 task midnight-6am IST
#  4. CloudWatch log retention tuned per service
# ---------------------------------------------------------

# ── 1. FARGATE SPOT for Frontend ─────────────────────────────────────────
# Frontend (Next.js) is stateless — perfect for Spot.
# Spot is interrupted rarely (< 5% of time) and ECS replaces within seconds.
# Savings: ~70% off frontend Fargate cost = ~$20/month saved

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = module.ecs.cluster_name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # Default strategy: prefer SPOT, fall back to FARGATE
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 3   # 75% SPOT
    base              = 0
  }
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1   # 25% regular (at least 1 guaranteed task)
    base              = 1   # Always keep 1 regular task as baseline
  }
}

# ── 2. ECR Lifecycle Policy — Keep only last 10 images ───────────────────
# Each Docker image is ~300-500 MB. Without a policy, old images
# accumulate with every deployment. Savings: ~$3-5/month

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = module.ecs.backend_ecr_name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = module.ecs.frontend_ecr_name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep only the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ── 3. Scheduled Scaling — Reduce at night ───────────────────────────────
# E-commerce traffic is nearly zero between 9 PM - 7 AM IST
# (9 PM IST = 15:30 UTC, 7 AM IST = 01:30 UTC)
# Scale down to 1 task at night — now works since min_capacity = 1
# Extended window (9 PM to 7 AM = 10 hours vs old 11 PM to 6 AM = 7 hours)
# Savings: ~$8-12/month

# Scale DOWN — 11:00 PM IST = 17:30 UTC
resource "aws_appautoscaling_scheduled_action" "backend_scale_down_night" {
  name               = "anjali-backend-scale-down-night-v2"
  service_namespace  = "ecs"
  resource_id        = "service/anjali-alankaram-cluster/anjali-alankaram-backend-service"
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(30 17 * * ? *)"   # 17:30 UTC = 11:00 PM IST daily

  scalable_target_action {
    min_capacity = 1
    max_capacity = 1   # Force down to exactly 1 task (single instance) at night
  }

  depends_on = [module.ecs]
}

resource "aws_appautoscaling_scheduled_action" "frontend_scale_down_night" {
  name               = "anjali-frontend-scale-down-night-v2"
  service_namespace  = "ecs"
  resource_id        = "service/anjali-alankaram-cluster/anjali-alankaram-frontend-service"
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(30 17 * * ? *)"   # 17:30 UTC = 11:00 PM IST daily

  scalable_target_action {
    min_capacity = 1
    max_capacity = 1   # Force down to exactly 1 task (single instance) at night
  }

  depends_on = [module.ecs]
}

# Scale UP — 10:00 AM IST = 04:30 UTC
resource "aws_appautoscaling_scheduled_action" "backend_scale_up_morning" {
  name               = "anjali-backend-scale-up-morning-v2"
  service_namespace  = "ecs"
  resource_id        = "service/anjali-alankaram-cluster/anjali-alankaram-backend-service"
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(30 4 * * ? *)"    # 04:30 UTC = 10:00 AM IST daily

  scalable_target_action {
    min_capacity = var.backend_min_tasks
    max_capacity = var.backend_max_tasks
  }

  depends_on = [module.ecs]
}

resource "aws_appautoscaling_scheduled_action" "frontend_scale_up_morning" {
  name               = "anjali-frontend-scale-up-morning-v2"
  service_namespace  = "ecs"
  resource_id        = "service/anjali-alankaram-cluster/anjali-alankaram-frontend-service"
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(30 4 * * ? *)"    # 04:30 UTC = 10:00 AM IST daily

  scalable_target_action {
    min_capacity = var.frontend_min_tasks
    max_capacity = var.frontend_max_tasks
  }

  depends_on = [module.ecs]
}

# ── 4. Tune CloudWatch Log Retention ─────────────────────────────────────
# Reduce Lambda alert logs (rarely needed after 7 days)
# ECS logs already set to 30 days — keep for debugging
resource "aws_cloudwatch_log_group" "lambda_alerts_optimized" {
  name              = "/aws/lambda/anjali-alankaram-whatsapp-alert"
  retention_in_days = 7    # was 14 — save ~50% on this log group
  tags              = local.common_tags

  lifecycle {
    ignore_changes = [name]   # don't recreate if already exists
  }
}
