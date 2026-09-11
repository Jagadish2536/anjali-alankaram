variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-south-2" # Hyderabad (or ap-south-1 for Mumbai)
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "anjali-alankaram"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 Instance type (t4g.small ARM Graviton2 delivers 2 vCPUs + 2GB RAM for ~$12/mo)"
  type        = string
  default     = "t4g.small"
}

variable "disk_size_gb" {
  description = "Root EBS storage volume size in GB (gp3 SSD)"
  type        = number
  default     = 20
}

variable "key_name" {
  description = "Name of existing AWS SSH Key Pair for EC2 SSH access"
  type        = string
  default     = "anjali-ec2-key"
}

variable "domain_name" {
  description = "Domain name for Route 53 DNS records"
  type        = string
  default     = "anjalialankaram.com"
}

variable "alert_email" {
  description = "Email address to receive AWS budget & cost billing alerts"
  type        = string
  default     = "jagadishvarma99@gmail.com"
}

variable "monthly_billing_threshold_usd" {
  description = "Monthly AWS billing alert threshold in USD"
  type        = number
  default     = 20
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform-Simple"
    CostTarget  = "Under-5000-INR"
  }
}
