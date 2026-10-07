data "archive_file" "resume_processor" {
  type = "zip"

  source_file = "${path.root}/../lambda/resume-processor.mjs"

  output_path = "${path.root}/resume-processor.zip"
}

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-Lambda-Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "lambda.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda" {
  name = "${var.project_name}-Lambda-Policy"

  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      {
        Effect = "Allow"

        Action = [
          "s3:GetObject",
          "s3:HeadObject"
        ]

        Resource = "${var.documents_bucket_arn}/*"
      },

      {
        Effect = "Allow"

        Action = [
          "sqs:SendMessage"
        ]

        Resource = var.sqs_queue_arn
      },

      {
        Effect = "Allow"

        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]

        Resource = "*"
      }
    ]
  })
}

resource "aws_lambda_function" "resume_processor" {
  function_name = "${var.project_name}-ResumeProcessor"

  role = aws_iam_role.lambda.arn

  handler = "resume-processor.handler"

  runtime = "nodejs22.x"

  filename = data.archive_file.resume_processor.output_path

  source_code_hash = data.archive_file.resume_processor.output_base64sha256

  timeout = 60

  memory_size = 256

  environment {
    variables = {
      QUEUE_URL = var.sqs_queue_url
    }
  }

  tags = {
    Name = "${var.project_name}-ResumeProcessor"
  }
}