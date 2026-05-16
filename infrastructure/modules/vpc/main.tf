# ---------------------------------------------------------
# VPC Module - main.tf
# Designed for cost-efficiency (No NAT Gateway)
# ---------------------------------------------------------

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"

  name = "${var.project_name}-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  # We use public subnets for all resources to avoid NAT Gateway costs (~$30/mo)
  # Security is maintained via strict Security Groups instead of private subnets.
  public_subnets  = var.public_subnets
  
  # Ensure instances in public subnets get public IPs by default
  map_public_ip_on_launch = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = var.tags
}
