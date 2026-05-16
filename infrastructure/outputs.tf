output "alb_dns_name" {
  value = module.alb.alb_dns_name
}
output "route53_nameservers" {
  value = module.alb.route53_nameservers
}
output "rds_endpoint" {
  value = module.rds.db_endpoint
}
output "redis_endpoint" {
  value = module.redis.redis_endpoint
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
