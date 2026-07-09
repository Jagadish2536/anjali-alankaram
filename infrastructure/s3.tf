# ---------------------------------------------------------
# S3 Bucket for Product Images, AI Images, and Static Assets
# ---------------------------------------------------------

resource "aws_s3_bucket" "assets" {
  bucket        = "${var.project_name}-assets-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.assets.id
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

  depends_on = [aws_s3_bucket_public_access_block.assets]
}

# --- S3 Versioning (for data protection) ---
resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

# --- Encryption at rest ---
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true # Reduces encryption request costs by ~99%
  }
}

# --- S3 Lifecycle Rules ---
resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  # Rule 1: Auto-delete temporary AI images after 48 hours
  rule {
    id     = "cleanup-temp-ai-images"
    status = "Enabled"

    filter {
      prefix = "temp-ai-images/"
    }

    expiration {
      days = 2 # 48 hours
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }
  }

  # Rule 2: Transition old product images to S3 Standard-IA after 90 days (cost saving)
  rule {
    id     = "products-tiering"
    status = "Enabled"

    filter {
      prefix = "products/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER_IR" # Very old images — archive for compliance
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  # Rule 3: Cleanup log retention — keep 90 days of cleanup logs
  rule {
    id     = "cleanup-logs-retention"
    status = "Enabled"

    filter {
      prefix = "cleanup-logs/"
    }

    expiration {
      days = 90
    }
  }

  # Rule 4: Delete failed/incomplete multipart uploads after 7 days
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # Rule 5: Videos transition to cheaper storage after 180 days
  rule {
    id     = "videos-tiering"
    status = "Enabled"

    filter {
      prefix = "videos/"
    }

    transition {
      days          = 180
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

data "aws_caller_identity" "current" {}

output "s3_bucket_name" {
  value = aws_s3_bucket.assets.id
}

output "s3_bucket_arn" {
  value = aws_s3_bucket.assets.arn
}
