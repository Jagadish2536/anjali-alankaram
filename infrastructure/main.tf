# ---------------------------------------------------------
# Root Terraform Orchestration
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
  source                    = "./modules/ecs"
  project_name              = var.project_name
  aws_region                = var.aws_region
  public_subnets            = module.vpc.public_subnets
  ecs_tasks_sg_id           = module.security.ecs_tasks_sg_id
  backend_target_group_arn  = module.alb.backend_target_group_arn
  frontend_target_group_arn = module.alb.frontend_target_group_arn
  ecs_execution_role_arn    = module.security.ecs_task_execution_role_arn
  ecs_task_role_arn         = module.security.ecs_task_role_arn
  secrets_arn               = aws_secretsmanager_secret.backend_secrets.arn
  tags                      = local.common_tags
}
