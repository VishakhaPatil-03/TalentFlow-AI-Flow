resource "aws_launch_template" "this" {
  name_prefix = "${var.project_name}-"

  image_id = var.ami_id

  instance_type = var.instance_type

  key_name = var.key_name

  iam_instance_profile {
    name = var.iam_instance_profile
  }

  vpc_security_group_ids = [
    var.app_security_group_id
  ]

  user_data = base64encode(
    templatefile("${path.module}/user_data.sh", {
      project_name  = var.project_name
      rds_secret_arn = var.rds_secret_arn
    })
  )

  monitoring {
    enabled = true
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name = "${var.project_name}-Backend"
    }
  }
}

resource "aws_autoscaling_group" "this" {
  name = "${var.project_name}-ASG"

  min_size = var.min_size

  desired_capacity = var.desired_capacity

  max_size = var.max_size

  vpc_zone_identifier = var.private_app_subnet_ids

  target_group_arns = [
    var.target_group_arn
  ]

  health_check_type = "ELB"

  health_check_grace_period = 180

  launch_template {
    id = aws_launch_template.this.id

    version = "$Latest"
  }

  tag {
    key = "Name"

    value = "${var.project_name}-Backend"

    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "cpu" {
  name = "${var.project_name}-CPU-TargetTracking"

  policy_type = "TargetTrackingScaling"

  autoscaling_group_name = aws_autoscaling_group.this.name

  target_tracking_configuration {

    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }

    target_value = 60
  }
}