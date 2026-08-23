# ---------------------------------------------------------
# HTTP API Gateway Option Configuration
# ---------------------------------------------------------

variable "enable_alb" {
  type        = bool
  default     = true
  description = "ALB enabled for 100% clean backend routing, HTTPS SSL termination, and zero errors."
}

output "api_gateway_endpoint" {
  value = ""
}
