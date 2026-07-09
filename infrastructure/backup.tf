# ---------------------------------------------------------
# AWS Backup Configuration (Disaster Recovery & Data Protection)
# ---------------------------------------------------------

# --- Backup Vault ---
resource "aws_backup_vault" "main" {
  name = "${var.project_name}-backup-vault"
  tags = local.common_tags
}

# --- IAM Role for AWS Backup Service ---
resource "aws_iam_role" "backup" {
  name = "${var.project_name}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}

# --- AWS Backup Plan (Daily schedule with 7-day retention) ---
resource "aws_backup_plan" "daily" {
  name = "${var.project_name}-daily-backup-plan"

  rule {
    rule_name         = "daily-backup-rule"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 20 * * ? *)" # 20:00 UTC = 01:30 AM IST (Low activity window)

    lifecycle {
      delete_after = 7 # Keep backups for 7 days
    }
  }

  tags = local.common_tags
}

# --- Backup Target Resource Selection (RDS & S3) ---
resource "aws_backup_selection" "db_and_storage" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-backup-selection"
  plan_id      = aws_backup_plan.daily.id

  resources = [
    module.rds.db_instance_arn,
    aws_s3_bucket.assets.arn,
  ]
}
