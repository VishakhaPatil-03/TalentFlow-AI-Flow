output "processing_queue_arn" {
  value = aws_sqs_queue.processing.arn
}

output "processing_queue_url" {
  value = aws_sqs_queue.processing.url
}

output "processing_queue_name" {
  value = aws_sqs_queue.processing.name
}

output "dlq_arn" {
  value = aws_sqs_queue.dlq.arn
}