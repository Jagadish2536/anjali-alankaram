# --- variables.tf ---
variable "project_name" {}
variable "public_subnets" {}
variable "rds_sg_id" {}
variable "db_name" {}
variable "db_username" {}
variable "db_password" {}
variable "tags" {}

variable "multi_az" {
  type        = bool
  default     = false
  description = "Enable Multi-AZ deployment for high availability failover"
}
