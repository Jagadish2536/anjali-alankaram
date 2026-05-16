resource "aws_secretsmanager_secret" "backend_secrets" {
  name        = "${var.project_name}-backend-env"
  description = "Production environment variables for the backend"
}

resource "aws_secretsmanager_secret_version" "backend_secrets_initial" {
  secret_id     = aws_secretsmanager_secret.backend_secrets.id
  secret_string = jsonencode({
    JWT_SECRET        = "changeme_in_aws_console",
    DATABASE_URL      = "postgresql://${var.db_username}:${var.db_password}@${module.rds.db_endpoint}/${var.db_name}",
    REDIS_HOST        = module.redis.redis_endpoint,
    MSG91_AUTH_KEY    = "add_your_key",
    MSG91_TEMPLATE_ID = "add_your_template"
  })
}
