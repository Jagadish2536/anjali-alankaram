# ---------------------------------------------------------
# Root Terraform Orchestration
# Elastic Auto-Scaling Architecture
# Supports <100 to 100,000+ concurrent users — zero manual changes required
# ---------------------------------------------------------

module "vpc" {
  source             = "./modules/vpc"
  project_name       = var.project_name
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnets     = var.public_subnets
  tags               = local.common_tags
}

module "security" {
  source       = "./modules/security"
  project_name = var.project_name
  vpc_id       = module.vpc.vpc_id
  secrets_arn  = aws_secretsmanager_secret.backend_secrets.arn
  tags         = local.common_tags
}

module "alb" {
  source         = "./modules/alb"
  project_name   = var.project_name
  vpc_id         = module.vpc.vpc_id
  public_subnets = module.vpc.public_subnets
  alb_sg_id      = module.security.alb_sg_id
  domain_name    = var.domain_name
  tags           = local.common_tags
}

module "rds" {
  source         = "./modules/rds"
  project_name   = var.project_name
  public_subnets = module.vpc.public_subnets
  rds_sg_id      = module.security.rds_sg_id
  db_name        = var.db_name
  db_username    = var.db_username
  db_password    = var.db_password
  multi_az       = var.tier == 2 ? true : false
  tags           = local.common_tags
}

module "redis" {
  source         = "./modules/redis"
  project_name   = var.project_name
  public_subnets = module.vpc.public_subnets
  redis_sg_id    = module.security.redis_sg_id
  tags           = local.common_tags
}

module "ecs" {
  source                            = "./modules/ecs"
  project_name                      = var.project_name
  aws_region                        = var.aws_region
  public_subnets                    = module.vpc.public_subnets
  ecs_tasks_sg_id                   = module.security.ecs_tasks_sg_id
  backend_target_group_arn          = module.alb.backend_target_group_arn
  frontend_target_group_arn         = module.alb.frontend_target_group_arn
  alb_arn_suffix                    = module.alb.alb_arn_suffix
  backend_target_group_arn_suffix   = module.alb.backend_target_group_arn_suffix
  frontend_target_group_arn_suffix  = module.alb.frontend_target_group_arn_suffix
  ecs_execution_role_arn            = module.security.ecs_task_execution_role_arn
  ecs_task_role_arn                 = module.security.ecs_task_role_arn
  secrets_arn                       = aws_secretsmanager_secret.backend_secrets.arn
  s3_bucket_name                    = aws_s3_bucket.assets.id
  cloudfront_domain                 = var.cloudfront_domain
  backend_min_tasks                 = var.backend_min_tasks
  backend_max_tasks                 = var.backend_max_tasks
  frontend_min_tasks                = var.frontend_min_tasks
  frontend_max_tasks                = var.frontend_max_tasks
  backend_cpu_scale_threshold       = var.backend_cpu_scale_threshold
  backend_memory_scale_threshold    = var.backend_memory_scale_threshold
  alb_requests_per_target_threshold = var.alb_requests_per_target_threshold
  tags                              = local.common_tags

  depends_on = [module.alb]
}
