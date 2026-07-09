# ---------------------------------------------------------
# ECS Module - variables.tf
# ---------------------------------------------------------

variable "project_name" {}
variable "aws_region" {}
variable "public_subnets" { type = list(string) }
variable "ecs_tasks_sg_id" {}
variable "backend_target_group_arn" {}
variable "frontend_target_group_arn" {}
variable "ecs_execution_role_arn" {}
variable "ecs_task_role_arn" {}
variable "secrets_arn" {}
variable "s3_bucket_name" {}
variable "tags" { type = map(string) }

variable "backend_min_tasks" {
  description = "Minimum backend ECS tasks"
  type        = number
  default     = 1
}

variable "backend_max_tasks" {
  description = "Maximum backend ECS tasks"
  type        = number
  default     = 100
}

variable "frontend_min_tasks" {
  description = "Minimum frontend ECS tasks"
  type        = number
  default     = 1
}

variable "frontend_max_tasks" {
  description = "Maximum frontend ECS tasks"
  type        = number
  default     = 50
}

variable "backend_cpu_scale_threshold" {
  type    = number
  default = 60
}

variable "backend_memory_scale_threshold" {
  type    = number
  default = 75
}

variable "alb_requests_per_target_threshold" {
  type    = number
  default = 500
}

variable "cloudfront_domain" {
  description = "CloudFront domain for serving assets"
  default     = ""
}

variable "alb_arn_suffix" {
  type        = string
  description = "ARN suffix of the Application Load Balancer"
}

variable "backend_target_group_arn_suffix" {
  type        = string
  description = "ARN suffix of the backend Target Group"
}

variable "frontend_target_group_arn_suffix" {
  type        = string
  description = "ARN suffix of the frontend Target Group"
}