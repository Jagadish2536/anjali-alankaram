# --- Variables ---
variable "project_name" {}
variable "vpc_cidr" {}
variable "availability_zones" {}
variable "public_subnets" {}
variable "tags" {}

# --- Outputs ---
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnets" {
  value = module.vpc.public_subnets
}
