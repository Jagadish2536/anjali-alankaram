# ---------------------------------------------------------
# RDS Module - main.tf
# ---------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = var.public_subnets # Must be public if VPC has no private subnets

  tags = var.tags
}

resource "aws_db_instance" "postgres" {
  identifier             = "anjali-alankaram-db-wiped"  # Match current production identifier — DO NOT change (would alter endpoint URL)
  allocated_storage      = 30          # Tier 1: 30 GB (was 20 GB)
  max_allocated_storage  = 100         # Auto-scale storage up to 100 GB if needed
  storage_type           = "gp3"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t4g.micro"  # 1 GB RAM (Cost Optimization)
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]

  # Reliability & Safety
  publicly_accessible     = false
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 7
  multi_az                = false           # Enable for Tier 2 (failover replica)
  apply_immediately       = true            # Apply instance resize now, not next maintenance window

  tags = var.tags
}
