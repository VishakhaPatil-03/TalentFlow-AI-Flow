resource "aws_sqs_queue" "dlq" {
  name = "${var.project_name}-DLQ"

  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "processing" {
  name = "${var.project_name}-Processing"

  visibility_timeout_seconds = 60

  message_retention_seconds = 345600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn

    maxReceiveCount = 3
  })
}