resource "aws_cloudwatch_log_group" "application" {
  name = "/talentflow-ai/application"

  retention_in_days = 30
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name = "${var.project_name}-RDS-HighCPU"

  alarm_description = "RDS CPU utilization above 70 percent"

  namespace = "AWS/RDS"

  metric_name = "CPUUtilization"

  statistic = "Average"

  period = 300

  evaluation_periods = 2

  threshold = 70

  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    DBInstanceIdentifier = var.rds_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "asg_cpu" {
  alarm_name = "${var.project_name}-ASG-HighCPU"

  alarm_description = "ASG CPU utilization above 70 percent"

  namespace = "AWS/EC2"

  metric_name = "CPUUtilization"

  statistic = "Average"

  period = 300

  evaluation_periods = 2

  threshold = 70

  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    AutoScalingGroupName = var.asg_name
  }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name = "${var.project_name}-ALB-5XX"

  alarm_description = "ALB target 5XX errors"

  namespace = "AWS/ApplicationELB"

  metric_name = "HTTPCode_Target_5XX_Count"

  statistic = "Sum"

  period = 300

  evaluation_periods = 2

  threshold = 5

  comparison_operator = "GreaterThanThreshold"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix

    TargetGroup = var.target_group_arn_suffix
  }
}