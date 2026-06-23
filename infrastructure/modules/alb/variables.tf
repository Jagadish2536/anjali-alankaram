# --- variables.tf ---
variable "project_name" {}
variable "vpc_id" {}
variable "public_subnets" {}
variable "alb_sg_id" {}
variable "domain_name" {
  description = "The root domain name (e.g. anjalialankaram.com). If empty, Route53 and HTTPS won't be configured."
  default     = ""
}
variable "tags" {}

# --- outputs.tf ---
output "frontend_target_group_arn" {
  value = aws_lb_target_group.frontend.arn
}
output "backend_target_group_arn" {
  value = aws_lb_target_group.backend.arn
}
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}
output "route53_zone_id" {
  value = var.domain_name != "" ? aws_route53_zone.main[0].zone_id : ""
}
output "route53_nameservers" {
  value = var.domain_name != "" ? aws_route53_zone.main[0].name_servers : []
}

output "alb_arn_suffix" {
  value = aws_lb.main.arn_suffix
}

