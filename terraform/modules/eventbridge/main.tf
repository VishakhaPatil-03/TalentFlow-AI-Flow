resource "aws_cloudwatch_event_bus" "this" {
  name = "${var.project_name}-EventBus"
}

resource "aws_cloudwatch_event_rule" "application_events" {
  name = "${var.project_name}-ApplicationEvents"

  event_bus_name = aws_cloudwatch_event_bus.this.name

  event_pattern = jsonencode({
    source = [
      "talentflow.application"
    ]

    detail-type = [
      "APPLICATION_CREATED",
      "RESUME_UPLOADED",
      "SCREENING_COMPLETED",
      "CANDIDATE_SHORTLISTED",
      "INTERVIEW_SCHEDULED",
      "CANDIDATE_SELECTED"
    ]
  })
}

resource "aws_iam_role" "eventbridge" {
  name = "${var.project_name}-EventBridge-Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "events.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "eventbridge" {
  name = "${var.project_name}-EventBridge-SQS"

  role = aws_iam_role.eventbridge.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "sqs:SendMessage"
        ]

        Resource = var.processing_queue_arn
      }
    ]
  })
}

resource "aws_cloudwatch_event_target" "sqs" {
  rule = aws_cloudwatch_event_rule.application_events.name

  event_bus_name = aws_cloudwatch_event_bus.this.name

  arn = var.processing_queue_arn

  role_arn = aws_iam_role.eventbridge.arn
}