variable "aws_region" {
  description = "AWS region"
  default     = "ap-south-2"
}

variable "project_name" {
  description = "Project name prefix"
  default     = "anjali-alankaram"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  default     = "production"
}

variable "domain_name" {
  description = "Root domain name for Route53 and ACM (e.g. anjalialankaram.com)"
  default     = "anjalialankaram.com"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-2a", "ap-south-2b"]
}

variable "public_subnets" {
  type    = list(string)
  default = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "db_name" {
  default = "anjali_alankaram"
}

variable "db_username" {
  default = "postgres"
}

variable "db_password" {
  description = "Database password. Should ideally be passed via TF_VAR_db_password"
  default     = "AnjaliAlankaram2026Secure"
  sensitive   = true
}

# ─── Auto Scaling Configuration ────────────────────────────────────────────────
# True elastic auto-scaling — no manual tier changes required.
# The infrastructure automatically supports <100 to 100,000+ concurrent users.

variable "backend_min_tasks" {
  description = "Minimum ECS backend tasks (keep at 1 for cost optimization at startup)"
  type        = number
  default     = 1
}

variable "backend_max_tasks" {
  description = "Maximum ECS backend tasks (supports up to 100,000+ concurrent users)"
  type        = number
  default     = 100
}

variable "frontend_min_tasks" {
  description = "Minimum ECS frontend tasks"
  type        = number
  default     = 1
}

variable "frontend_max_tasks" {
  description = "Maximum ECS frontend tasks"
  type        = number
  default     = 50
}

variable "backend_cpu_scale_threshold" {
  description = "CPU utilization % to trigger backend scale-out"
  type        = number
  default     = 60
}

variable "backend_memory_scale_threshold" {
  description = "Memory utilization % to trigger backend scale-out"
  type        = number
  default     = 75
}

variable "alb_requests_per_target_threshold" {
  description = "ALB requests per ECS target to trigger scale-out"
  type        = number
  default     = 500
}

variable "cloudfront_domain" {
  description = "CloudFront distribution domain (e.g. d1234.cloudfront.net). Leave empty to use S3 direct URLs."
  default     = ""
}



variable "enable_multi_az" {
  type        = bool
  default     = false
  description = "Enable Multi-AZ RDS deployment for HA database backup replicas"
}

variable "enable_waf" {
  type        = bool
  default     = false
  description = "Enable AWS WAF edge protection for CloudFront distribution"
}

variable "enable_redis" {
  type        = bool
  default     = true
  description = "Enable ElastiCache Redis cluster resource provisioning"
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = "Production"
  }
}
