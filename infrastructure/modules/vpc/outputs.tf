# --- Variables ---
variable "project_name" {}
variable "vpc_cidr" {}
variable "availability_zones" {}
variable "public_subnets" {}
variable "tags" {}

# --- Outputs ---
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnets" {
  value = aws_subnet.public[*].id
}
