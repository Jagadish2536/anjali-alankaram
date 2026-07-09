resource "aws_secretsmanager_secret" "backend_secrets" {
  name                    = "${var.project_name}-backend-env"
  recovery_window_in_days = 0  # Cost optimization: instant deletion (no 7-30 day recovery window)
  tags                    = local.common_tags

  # IMPORTANT: After Terraform apply, populate the following keys in AWS Console or via secrets:push script:
  # JWT_SECRET, DATABASE_URL, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD,
  # JWT_ACCESS_EXPIRES, MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, GOOGLE_CLIENT_ID,
  # RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
  # SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, FIREBASE_SERVICE_ACCOUNT_BASE64,
  # RATE_LIMIT_REQUESTS, ALLOWED_ORIGINS, SES_FROM_EMAIL, SES_FROM_NAME,
  # MSG91_WHATSAPP_SENDER, MSG91_WHATSAPP_OTP_TEMPLATE_NAME,
  # MSG91_WHATSAPP_FORGOT_PASSWORD_TEMPLATE_NAME, MSG91_WHATSAPP_ORDER_PLACED_TEMPLATE,
  # MSG91_WHATSAPP_ORDER_SHIPPED_TEMPLATE, MSG91_WHATSAPP_ORDER_DELIVERED_TEMPLATE,
  # MSG91_WHATSAPP_ORDER_CANCELLED_TEMPLATE,
  # OPENAI_API_KEY  <-- Required for AI Product Image Generation
}

resource "aws_secretsmanager_secret" "frontend_secrets" {
  name = "${var.project_name}-frontend-env"
  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "backend_version" {
  secret_id = aws_secretsmanager_secret.backend_secrets.id
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
