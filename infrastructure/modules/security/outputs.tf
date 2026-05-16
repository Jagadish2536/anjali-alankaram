output "alb_sg_id" {
  value = aws_security_group.alb.id
}
output "ecs_tasks_sg_id" {
  value = aws_security_group.ecs_tasks.id
}
output "rds_sg_id" {
  value = aws_security_group.rds.id
}
output "redis_sg_id" {
  value = aws_security_group.redis.id
}
output "ecs_task_execution_role_arn" {
  value = aws_iam_role.ecs_task_execution_role.arn
}
output "ecs_task_role_arn" {
  value = aws_iam_role.ecs_task_role.arn
}
