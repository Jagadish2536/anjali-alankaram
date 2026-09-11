output "server_public_ip" {
  description = "Static Elastic IP address of the EC2 server"
  value       = aws_eip.app_eip.public_ip
}

output "ssh_command" {
  description = "Command to SSH directly into the EC2 server"
  value       = "ssh -i anjali_ec2_key.pem ubuntu@${aws_eip.app_eip.public_ip}"
}

output "website_url" {
  description = "Live Production Website URL"
  value       = "https://${var.domain_name}"
}

output "monthly_cost_estimate" {
  description = "Estimated monthly AWS bill breakdown"
  value       = "EC2 t4g.small ($12.26) + EBS 20GB ($1.60) + EIP ($0.00) + Route53 ($0.50) + 18% GST ($2.60) = ~$17.00 USD / mo (~₹1,430 INR / month)"
}
