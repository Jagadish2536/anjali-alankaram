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
  # Value is managed manually in AWS Console or via CI to prevent overwrites
  secret_string = "{}"
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# We create the frontend secret container, but values are managed manually in console or via CI
resource "aws_secretsmanager_secret_version" "frontend_version" {
  secret_id     = aws_secretsmanager_secret.frontend_secrets.id
  secret_string = "{}"
  lifecycle {
    ignore_changes = [secret_string]
  }
}
