# --- variables.tf ---
variable "project_name" {}
variable "aws_region" {}
variable "public_subnets" {}
variable "ecs_tasks_sg_id" {}
variable "backend_target_group_arn" {}
variable "frontend_target_group_arn" {}
variable "ecs_execution_role_arn" {}
variable "ecs_task_role_arn" {}
variable "secrets_arn" {}
variable "tags" {}

# --- outputs.tf ---
output "cluster_name" {
  value = aws_ecs_cluster.main.name
}
output "backend_service_name" {
  value = aws_ecs_service.backend.name
}
output "frontend_service_name" {
  value = aws_ecs_service.frontend.name
}
output "backend_ecr_url" {
  value = aws_ecr_repository.backend.repository_url
}
output "frontend_ecr_url" {
  value = aws_ecr_repository.frontend.repository_url
}
