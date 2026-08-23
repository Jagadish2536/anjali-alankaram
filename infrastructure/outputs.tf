output "alb_dns_name" {
  value = var.enable_alb ? module.alb[0].alb_dns_name : ""
}
output "route53_nameservers" {
  value = data.aws_route53_zone.main.name_servers
}
output "rds_endpoint" {
  value = module.rds.db_endpoint
}
output "redis_endpoint" {
  value = var.enable_redis ? module.redis[0].redis_endpoint : ""
}
output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}
output "backend_ecr_repository" {
  value = module.ecs.backend_ecr_url
}
output "frontend_ecr_repository" {
  value = module.ecs.frontend_ecr_url
}
