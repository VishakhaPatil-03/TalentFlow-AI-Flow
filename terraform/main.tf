terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# --------------------------------------------------
# VPC
# --------------------------------------------------

module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment

  vpc_cidr = var.vpc_cidr

  availability_zones = var.availability_zones

  public_subnet_cidrs = var.public_subnet_cidrs

  private_app_subnet_cidrs = var.private_app_subnet_cidrs

  private_db_subnet_cidrs = var.private_db_subnet_cidrs
}

# --------------------------------------------------
# S3
# --------------------------------------------------

module "s3" {
  source = "./modules/s3"

  project_name = var.project_name
  environment  = var.environment
}

# --------------------------------------------------
# RDS
# --------------------------------------------------

module "rds" {
  source = "./modules/rds"

  project_name = var.project_name
  environment  = var.environment

  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password

  db_subnet_ids = module.vpc.private_db_subnet_ids

  rds_security_group_id = module.security.rds_security_group_id
}

# --------------------------------------------------
# IAM
# --------------------------------------------------

module "iam" {
  source = "./modules/iam"

  project_name = var.project_name

  s3_bucket_arn = module.s3.bucket_arn

  rds_secret_arn = module.rds.secret_arn
}

# --------------------------------------------------
# SECURITY GROUPS
# --------------------------------------------------

module "security" {
  source = "./modules/security"

  project_name = var.project_name

  vpc_id = module.vpc.vpc_id

  admin_ip = var.admin_ip
}

# --------------------------------------------------
# ALB
# --------------------------------------------------

module "alb" {
  source = "./modules/alb"

  project_name = var.project_name

  vpc_id = module.vpc.vpc_id

  public_subnet_ids = module.vpc.public_subnet_ids

  alb_security_group_id = module.security.alb_security_group_id
}

# --------------------------------------------------
# ASG
# --------------------------------------------------

module "asg" {
  source = "./modules/asg"

  project_name = var.project_name

  vpc_id = module.vpc.vpc_id

  private_app_subnet_ids = module.vpc.private_app_subnet_ids

  app_security_group_id = module.security.app_security_group_id

  target_group_arn = module.alb.target_group_arn

  iam_instance_profile = module.iam.ec2_instance_profile_name

  ami_id        = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name

  desired_capacity = var.desired_capacity
  min_size         = var.min_size
  max_size         = var.max_size

  rds_secret_arn = module.rds.secret_arn
}

# --------------------------------------------------
# SQS
# --------------------------------------------------

module "sqs" {
  source = "./modules/sqs"

  project_name = var.project_name
}

# --------------------------------------------------
# LAMBDA
# --------------------------------------------------

module "lambda" {
  source = "./modules/lambda"

  project_name = var.project_name

  aws_region = var.aws_region

  documents_bucket_arn = module.s3.bucket_arn

  documents_bucket_name = module.s3.bucket_name

  sqs_queue_arn = module.sqs.processing_queue_arn

  sqs_queue_url = module.sqs.processing_queue_url
}

# --------------------------------------------------
# EVENTBRIDGE
# --------------------------------------------------

module "eventbridge" {
  source = "./modules/eventbridge"

  project_name = var.project_name

  processing_queue_arn = module.sqs.processing_queue_arn
}

# --------------------------------------------------
# CLOUDWATCH
# --------------------------------------------------

module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name = var.project_name

  rds_identifier = module.rds.db_instance_identifier

  asg_name = module.asg.autoscaling_group_name

  alb_arn_suffix = module.alb.alb_arn_suffix

  target_group_arn_suffix = module.alb.target_group_arn_suffix
}