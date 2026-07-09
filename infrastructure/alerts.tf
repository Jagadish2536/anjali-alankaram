# ---------------------------------------------------------
# Anjali Alankaram — Infrastructure Alerts
# CloudWatch Alarms → SNS → HTML Email (SES) + WhatsApp
#
# Alerts:
#  1. Tier 2 Warning    — CPU > 60% for 10 min  → "Consider upgrading"
#  2. Tier 2 Urgent     — CPU > 80% for 5 min   → "Upgrade NOW"
#  3. DB Connections    — DB connections > 150   → "DB nearing limit"
#  4. DB Storage 80%    — Storage > 24 GB        → "Storage nearly full"
#  5. API Errors        — ALB 5XX > 10 in 5 min  → "Errors on website"
#  6. Service Down      — ECS tasks < 2          → "Site degraded"
#  7. Memory High       — Memory > 80%           → "Memory pressure"
#
# Email flow: SNS → Lambda (email_alert.py) → SES → HTML email
# NOTE: Raw SNS email subscription removed — ugly AWS format replaced
#       by the HTML Lambda below.
# ---------------------------------------------------------

# ── SNS Topic (central alert bus) ────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
  tags = local.common_tags
}

# ── REMOVED: plain SNS email subscription (sends raw ugly AWS text)
# resource "aws_sns_topic_subscription" "email" { ... }
# Replaced by the HTML email Lambda below (email_alert.py → SES)

# ── Lambda for WhatsApp via CallMeBot ─────────────────────────────────────
data "archive_file" "whatsapp_lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_src/whatsapp_alert.py"
  output_path = "${path.module}/lambda_src/whatsapp_alert.zip"
}

resource "aws_iam_role" "lambda_alerts" {
  name = "${var.project_name}-lambda-alerts-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_alerts.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Allow Lambda to send email via SES
resource "aws_iam_role_policy" "lambda_ses_send" {
  name = "${var.project_name}-lambda-ses-send"
  role = aws_iam_role.lambda_alerts.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendEmail", "ses:SendRawEmail"]
      Resource = "*"
    }]
  })
}


resource "aws_lambda_function" "whatsapp_alert" {
  filename         = data.archive_file.whatsapp_lambda_zip.output_path
  function_name    = "${var.project_name}-whatsapp-alert"
  role             = aws_iam_role.lambda_alerts.arn
  handler          = "whatsapp_alert.handler"
  runtime          = "python3.12"
  timeout          = 15
  source_code_hash = data.archive_file.whatsapp_lambda_zip.output_base64sha256

  environment {
    variables = {
      CALLMEBOT_APIKEY = "SET_AFTER_CALLMEBOT_REGISTRATION"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_alerts_optimized]
  tags       = local.common_tags
}

resource "aws_lambda_permission" "allow_sns" {
  statement_id  = "AllowSNSInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.whatsapp_alert.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts.arn
}

resource "aws_sns_topic_subscription" "whatsapp_lambda" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.whatsapp_alert.arn
}

# ── Lambda for HTML Email via SES ─────────────────────────────────────────
# Replaces the ugly raw SNS email with a clean branded HTML email.
# Sends FROM: alerts@anjalialankaram.com (SES domain already verified via ses.tf)

data "archive_file" "email_lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_src/email_alert.py"
  output_path = "${path.module}/lambda_src/email_alert.zip"
}

resource "aws_cloudwatch_log_group" "lambda_email_alerts" {
  name              = "/aws/lambda/${var.project_name}-email-alert"
  retention_in_days = 7
  tags              = local.common_tags
}

resource "aws_lambda_function" "email_alert" {
  filename         = data.archive_file.email_lambda_zip.output_path
  function_name    = "${var.project_name}-email-alert"
  role             = aws_iam_role.lambda_alerts.arn
  handler          = "email_alert.handler"
  runtime          = "python3.12"
  timeout          = 15
  source_code_hash = data.archive_file.email_lambda_zip.output_base64sha256

  depends_on = [aws_cloudwatch_log_group.lambda_email_alerts]
  tags       = local.common_tags
}

resource "aws_lambda_permission" "allow_sns_email" {
  statement_id  = "AllowSNSInvokeEmail"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.email_alert.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.alerts.arn
}

resource "aws_sns_topic_subscription" "email_lambda" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.email_alert.arn
}

# ---------------------------------------------------------
# CloudWatch Alarms → SNS
# ---------------------------------------------------------

# ── 1. Tier 2 Warning: CPU > 60% for 10 min ──────────────────────────────
resource "aws_cloudwatch_metric_alarm" "tier2_warning" {
  alarm_name          = "${var.project_name}-TIER2-WARNING-cpu-high"
  alarm_description   = "Backend CPU > 60% for 10 min. Consider upgrading to Tier 2 (Rs 26,000/mo, 2000 users)."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 10 # 10 x 1-min periods = 10 consecutive minutes
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 60
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "anjali-alankaram-cluster"
    ServiceName = "anjali-alankaram-backend-service"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

# ── 2. Tier 2 Urgent: CPU > 80% for 5 min ────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "tier2_urgent" {
  alarm_name          = "${var.project_name}-TIER2-URGENT-cpu-critical"
  alarm_description   = "URGENT: Backend CPU > 80% for 5 min. Upgrade to Tier 2 immediately!"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "anjali-alankaram-cluster"
    ServiceName = "anjali-alankaram-backend-service"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

# ── 3. DB Connections > 150 ───────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "db_connections_high" {
  alarm_name          = "${var.project_name}-db-connections-high"
  alarm_description   = "DB connections > 150. Max is ~200. Upgrade DB or Tier 2 needed soon."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 150
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = "anjali-alankaram-db-wiped"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

# ── 4. DB Storage > 24 GB (80% of 30 GB) ─────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "db_storage_low" {
  alarm_name          = "${var.project_name}-db-storage-low"
  alarm_description   = "DB free storage < 6 GB (storage at 80%). AWS will auto-scale but monitor closely."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300 # check every 5 min
  statistic           = "Average"
  threshold           = 6442450944 # 6 GB in bytes = 80% used of 30 GB
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = "anjali-alankaram-db-wiped"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

# ── 5. ALB 5XX Errors > 10 in 5 min ──────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.project_name}-alb-5xx-errors"
  alarm_description   = "Website returning errors (5XX) to customers. Check ECS logs immediately."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = module.alb.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

# ── 6. ECS Backend Running Tasks < 2 ─────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_tasks_low" {
  alarm_name          = "${var.project_name}-ecs-tasks-below-minimum"
  alarm_description   = "Running backend tasks < 1. Backend service is completely offline! Check ECS for failures."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  treat_missing_data  = "breaching" # treat missing as bad — task may be completely down

  dimensions = {
    ClusterName = "anjali-alankaram-cluster"
    ServiceName = "anjali-alankaram-backend-service"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

# ── 7. Memory > 80% ───────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "${var.project_name}-memory-high"
  alarm_description   = "Backend memory > 80% for 5 min. Auto-scaling may trigger. Monitor closely."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = "anjali-alankaram-cluster"
    ServiceName = "anjali-alankaram-backend-service"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.common_tags
}

# ── Outputs ───────────────────────────────────────────────────────────────
output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "SNS topic ARN for infrastructure alerts"
}

output "whatsapp_lambda_arn" {
  value       = aws_lambda_function.whatsapp_alert.arn
  description = "Lambda function that sends WhatsApp alerts"
}
