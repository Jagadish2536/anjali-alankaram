resource "aws_secretsmanager_secret" "backend_secrets" {
  name = "${var.project_name}-backend-env"
  tags = local.common_tags
}

resource "aws_secretsmanager_secret" "frontend_secrets" {
  name = "${var.project_name}-frontend-env"
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "backend_version" {
  secret_id     = aws_secretsmanager_secret.backend_secrets.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${var.db_username}:${var.db_password}@${module.rds.db_endpoint}/${var.db_name}"
    REDIS_HOST   = module.redis.redis_endpoint
    JWT_SECRET   = "changeme_in_aws_console"
    MSG91_AUTH_KEY = "add_your_key"
    MSG91_TEMPLATE_ID = "add_your_template"
    GOOGLE_CLIENT_ID = "add_your_client_id"
  })
}

# We create the frontend secret container, but values are managed manually in console or via CI
resource "aws_secretsmanager_secret_version" "frontend_version" {
  secret_id     = aws_secretsmanager_secret.frontend_secrets.id
  secret_string = jsonencode({
    NEXT_PUBLIC_API_URL          = "https://anjalialankaram.com/api/v1"
    NEXT_PUBLIC_RAZORPAY_KEY_ID  = "rzp_test_your_key_id"
    NEXT_PUBLIC_GOOGLE_CLIENT_ID = "add_your_client_id"
  })
}
