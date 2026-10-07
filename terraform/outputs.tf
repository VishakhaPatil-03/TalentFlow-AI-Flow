output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnets" {
  value = module.vpc.public_subnet_ids
}

output "private_app_subnets" {
  value = module.vpc.private_app_subnet_ids
}

output "private_db_subnets" {
  value = module.vpc.private_db_subnet_ids
}

output "s3_bucket" {
  value = module.s3.bucket_name
}

output "rds_endpoint" {
  value = module.rds.db_endpoint
}

output "rds_port" {
  value = module.rds.db_port
}

output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "autoscaling_group" {
  value = module.asg.autoscaling_group_name
}

output "sqs_queue_url" {
  value = module.sqs.processing_queue_url
}

output "lambda_function" {
  value = module.lambda.resume_processor_name
}

output "eventbridge_bus" {
  value = module.eventbridge.event_bus_name
}