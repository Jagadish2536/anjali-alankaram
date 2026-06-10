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

variable "tier" {
  description = "Application deployment tier (0: Minimal/Tier 0, 1: Standard, 2: Production scale)"
  type        = number
  default     = 1
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
