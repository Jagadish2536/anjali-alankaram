terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# AWS Billing metrics are globally pushed to us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

