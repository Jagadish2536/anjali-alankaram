# ---------------------------------------------------------
# RDS Module - main.tf
# ---------------------------------------------------------

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = var.public_subnets # Must be public if VPC has no private subnets

  tags = var.tags
}

resource "aws_db_instance" "postgres" {
  identifier           = "${var.project_name}-db"
  allocated_storage    = 20
  storage_type         = "gp3"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t4g.micro"
  db_name              = var.db_name
  username             = var.db_username
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]

  # Cost Optimization & Security
  publicly_accessible = false
  skip_final_snapshot = true # Can change for strict production
  backup_retention_period = 7
  multi_az                = false

  tags = var.tags
}
