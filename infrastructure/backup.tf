# ---------------------------------------------------------
# AWS Backup Configuration (Disaster Recovery & Data Protection)
# ---------------------------------------------------------

# --- Backup Vault ---
resource "aws_backup_vault" "main" {
  count       = var.tier == 2 ? 1 : 0
  name        = "${var.project_name}-backup-vault"
  kms_key_arn = "arn:aws:kms:${var.aws_region}:${data.aws_caller_identity.current.account_id}:alias/aws/backup"
  tags        = local.common_tags
}

# --- IAM Role for AWS Backup Service ---
resource "aws_iam_role" "backup" {
  count = var.tier == 2 ? 1 : 0
  name  = "${var.project_name}-backup-role"

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
  count      = var.tier == 2 ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup[0].name
}

# --- AWS Backup Plan (Daily schedule with 7-day retention) ---
resource "aws_backup_plan" "daily" {
  count = var.tier == 2 ? 1 : 0
  name  = "${var.project_name}-daily-backup-plan"

  rule {
    rule_name         = "daily-backup-rule"
    target_vault_name = aws_backup_vault.main[0].name
    schedule          = "cron(0 20 * * ? *)" # 20:00 UTC = 01:30 AM IST (Low activity window)

    lifecycle {
      delete_after = 7 # Keep backups for 7 days
    }
  }

  tags = local.common_tags
}

# --- Backup Target Resource Selection (RDS & S3) ---
resource "aws_backup_selection" "db_and_storage" {
  count        = var.tier == 2 ? 1 : 0
  iam_role_arn = aws_iam_role.backup[0].arn
  name         = "${var.project_name}-backup-selection"
  plan_id      = aws_backup_plan.daily[0].id

  resources = [
    module.rds.db_instance_arn,
    aws_s3_bucket.assets.arn,
  ]
}
