# --- variables.tf ---
variable "project_name" {}
variable "public_subnets" {}
variable "redis_sg_id" {}
variable "tags" {}

# --- outputs.tf ---
output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}
