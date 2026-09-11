# ─── Data Sources ──────────────────────────────────────────────────────────────
# Fetch latest Ubuntu 22.04 LTS ARM64 AMI for Graviton2 (t4g.small)
data "aws_ami" "ubuntu_arm" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-arm64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Fetch Default VPC
data "aws_vpc" "default" {
  default = true
}

# Fetch Route 53 Zone (if domain exists in account)
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# ─── SSH Key Pair ─────────────────────────────────────────────────────────────
resource "tls_private_key" "ec2_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "${var.project_name}-simple-key"
  public_key = tls_private_key.ec2_key.public_key_openssh

  tags = merge(local.common_tags, { Name = "${var.project_name}-key" })
}

resource "local_file" "private_key" {
  content         = tls_private_key.ec2_key.private_key_pem
  filename        = "${path.module}/anjali_ec2_key.pem"
  file_permission = "0600"
}

# ─── Security Group ───────────────────────────────────────────────────────────
resource "aws_security_group" "app_sg" {
  name        = "${var.project_name}-simple-sg"
  description = "Security group for single-server EC2 setup (HTTP, HTTPS, SSH)"
  vpc_id      = data.aws_vpc.default.id

  # Allow HTTP (port 80)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow incoming HTTP"
  }

  # Allow HTTPS (port 443)
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow incoming HTTPS"
  }

  # Allow SSH (port 22)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow SSH management access"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(local.common_tags, { Name = "${var.project_name}-sg" })
}

# ─── EC2 Instance ─────────────────────────────────────────────────────────────
resource "aws_instance" "app_server" {
  ami                  = data.aws_ami.ubuntu_arm.id
  instance_type        = var.instance_type
  key_name             = aws_key_pair.generated_key.key_name
  security_groups      = [aws_security_group.app_sg.name]
  user_data            = file("${path.module}/user_data.sh")
  user_data_replace_on_change = false

  root_block_device {
    volume_size           = var.disk_size_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = false
    tags = merge(local.common_tags, { Name = "${var.project_name}-disk" })
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-server"
    SnapshotTarget = "true"
  })
}

# ─── Elastic IP (Static Public IP) ────────────────────────────────────────────
resource "aws_eip" "app_eip" {
  instance = aws_instance.app_server.id
  domain   = "vpc"

  tags = merge(local.common_tags, { Name = "${var.project_name}-eip" })
}

# ─── Route 53 DNS Record ──────────────────────────────────────────────────────
resource "aws_route53_record" "apex" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = var.domain_name
  type            = "A"
  ttl             = 60
  records         = [aws_eip.app_eip.public_ip]
  allow_overwrite = true
}

resource "aws_route53_record" "www" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = "www.${var.domain_name}"
  type            = "A"
  ttl             = 60
  records         = [aws_eip.app_eip.public_ip]
  allow_overwrite = true
}

# ─── SES Email Deliverability (DKIM, SPF, DMARC) ────────────────────────────────
resource "aws_route53_record" "ses_dkim" {
  count           = 3
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = "${element(["owjhzugniovfn2ltedbg3duxxcqe4wys", "uad2psv7asoipv4cz3iz6qtc2rghhqec", "idaj6w56sczfocscisirx7d7uncv4rq5"], count.index)}._domainkey"
  type            = "CNAME"
  ttl             = 1800
  records         = ["${element(["owjhzugniovfn2ltedbg3duxxcqe4wys", "uad2psv7asoipv4cz3iz6qtc2rghhqec", "idaj6w56sczfocscisirx7d7uncv4rq5"], count.index)}.dkim.amazonses.com"]
  allow_overwrite = true
}

resource "aws_route53_record" "ses_spf" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = var.domain_name
  type            = "TXT"
  ttl             = 1800
  records         = ["v=spf1 include:amazonses.com ~all"]
  allow_overwrite = true
}

resource "aws_route53_record" "ses_dmarc" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = "_dmarc.${var.domain_name}"
  type            = "TXT"
  ttl             = 1800
  records         = ["v=DMARC1; p=none;"]
  allow_overwrite = true
}

# ─── Automated Daily EBS Snapshot Policy (DLM) ────────────────────────────────
resource "aws_iam_role" "dlm_lifecycle_role" {
  name = "${var.project_name}-dlm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm_lifecycle" {
  role       = aws_iam_role.dlm_lifecycle_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "daily_ebs_backup" {
  description        = "Daily 2 AM automated disk snapshot policy with 7-day retention"
  execution_role_arn = aws_iam_role.dlm_lifecycle_role.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    target_tags = {
      SnapshotTarget = "true"
    }

    schedule {
      name = "Daily Snapshots"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["02:00"] # 2:00 AM UTC (7:30 AM IST)
      }

      retain_rule {
        count = 7 # Keep 7 rolling daily snapshots
      }

      copy_tags = true
    }
  }

  tags = merge(local.common_tags, { Name = "${var.project_name}-daily-backup-policy" })
}

# ─── S3 Asset Storage Bucket ──────────────────────────────────────────────────
resource "aws_s3_bucket" "assets" {
  bucket        = "anjali-alankaram-assets-716403252967"
  force_destroy = false

  tags = merge(local.common_tags, { Name = "${var.project_name}-assets" })
}

resource "aws_s3_bucket_public_access_block" "assets_public" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "assets_cors" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_policy" "assets_public_read" {
  depends_on = [aws_s3_bucket_public_access_block.assets_public]
  bucket     = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.assets.arn}/*"
      }
    ]
  })
}

# ─── AWS Billing Email Alert (SNS + CloudWatch Alarm) ──────────────────────────
resource "aws_sns_topic" "billing_alerts" {
  provider = aws.us_east_1
  name     = "${var.project_name}-billing-alerts"

  tags = merge(local.common_tags, { Name = "${var.project_name}-billing-alerts" })
}

resource "aws_sns_topic_subscription" "billing_email_sub" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "billing_alarm" {
  provider            = aws.us_east_1
  alarm_name          = "${var.project_name}-monthly-bill-exceeded-${var.monthly_billing_threshold_usd}usd"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600 # 6 hours
  statistic           = "Maximum"
  threshold           = var.monthly_billing_threshold_usd
  alarm_description   = "Alarm triggered when estimated monthly AWS charges exceed $${var.monthly_billing_threshold_usd} USD"

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn]
}

# ─── Production Downtime & Outage Alerts (SNS + CloudWatch) ───────────────────
resource "aws_sns_topic" "prod_downtime_alerts" {
  name = "${var.project_name}-downtime-alerts"

  tags = merge(local.common_tags, { Name = "${var.project_name}-downtime-alerts" })
}

resource "aws_sns_topic_subscription" "downtime_email_sub" {
  topic_arn = aws_sns_topic.prod_downtime_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# 1. EC2 Instance Status Check Failure (Server Down / Crash / Reboot)
resource "aws_cloudwatch_metric_alarm" "ec2_status_check_failed" {
  alarm_name          = "${var.project_name}-ec2-server-down-alert"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60 # Check every 60 seconds
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "CRITICAL: Production EC2 server status check failed! Server is DOWN or unreachable."

  dimensions = {
    InstanceId = aws_instance.app_server.id
  }

  alarm_actions             = [aws_sns_topic.prod_downtime_alerts.arn]
  ok_actions                = [aws_sns_topic.prod_downtime_alerts.arn]
  insufficient_data_actions = [aws_sns_topic.prod_downtime_alerts.arn]
}

# 2. EC2 High CPU Utilization (> 90% for 5 minutes)
resource "aws_cloudwatch_metric_alarm" "ec2_high_cpu" {
  alarm_name          = "${var.project_name}-ec2-high-cpu-alert"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300 # 5 minutes
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "WARNING: EC2 server CPU load is above 90% for 5 minutes!"

  dimensions = {
    InstanceId = aws_instance.app_server.id
  }

  alarm_actions = [aws_sns_topic.prod_downtime_alerts.arn]
  ok_actions    = [aws_sns_topic.prod_downtime_alerts.arn]
}

# 3. Route 53 Live Website Health Check (HTTPS ping to anjalialankaram.com)
resource "aws_route53_health_check" "website" {
  fqdn              = var.domain_name
  port              = 80
  type              = "HTTP"
  resource_path     = "/"
  failure_threshold = 3
  request_interval  = 30

  tags = merge(local.common_tags, { Name = "${var.project_name}-website-healthcheck" })
}

resource "aws_cloudwatch_metric_alarm" "website_down" {
  provider            = aws.us_east_1
  alarm_name          = "${var.project_name}-website-down-alert"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HealthCheckStatus"
  namespace           = "AWS/Route53"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "CRITICAL ALERT: Website https://anjalialankaram.com is DOWN or non-responsive!"

  dimensions = {
    HealthCheckId = aws_route53_health_check.website.id
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn] # Uses us-east-1 SNS topic for Route 53 alarms
  ok_actions    = [aws_sns_topic.billing_alerts.arn]
}

# ─── Clean HTML Email Alert Formatter (AWS Lambda + SES) ────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda_alert_formatter.js"
  output_path = "${path.module}/lambda_alert_formatter.zip"
}

resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-alert-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_ses_policy" {
  name = "${var.project_name}-lambda-ses-policy"
  role = aws_iam_role.lambda_exec_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "alert_formatter" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-alert-formatter"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "lambda_alert_formatter.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 15

  environment {
    variables = {
      ALERT_EMAIL    = var.alert_email
      SES_FROM_EMAIL = "noreply@anjalialankaram.com"
      TARGET_REGION  = var.aws_region
    }
  }


  tags = merge(local.common_tags, { Name = "${var.project_name}-alert-formatter" })
}

# SNS -> Lambda Subscriptions
resource "aws_sns_topic_subscription" "lambda_downtime_sub" {
  topic_arn = aws_sns_topic.prod_downtime_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.alert_formatter.arn
}

resource "aws_sns_topic_subscription" "lambda_billing_sub" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.alert_formatter.arn
}

resource "aws_lambda_permission" "allow_sns_downtime" {
  statement_id  = "AllowExecutionFromSNSDowntime"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_formatter.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.prod_downtime_alerts.arn
}

resource "aws_lambda_permission" "allow_sns_billing" {
  statement_id  = "AllowExecutionFromSNSBilling"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert_formatter.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.billing_alerts.arn
}




