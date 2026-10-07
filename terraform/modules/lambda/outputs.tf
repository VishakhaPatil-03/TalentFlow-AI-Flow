output "resume_processor_arn" {
  value = aws_lambda_function.resume_processor.arn
}

output "resume_processor_name" {
  value = aws_lambda_function.resume_processor.function_name
}