# --- variables.tf ---
variable "project_name" {}
variable "public_subnets" {}
variable "rds_sg_id" {}
variable "db_name" {}
variable "db_username" {}
variable "db_password" {}
variable "tags" {}

# --- outputs.tf ---
output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}
output "db_name" {
  value = aws_db_instance.postgres.db_name
}
