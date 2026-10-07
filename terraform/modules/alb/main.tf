resource "aws_lb" "this" {
  name = "talentflow-ai-alb"

  load_balancer_type = "application"

  internal = false

  security_groups = [
    var.alb_security_group_id
  ]

  subnets = var.public_subnet_ids

  tags = {
    Name = "${var.project_name}-ALB"
  }
}

resource "aws_lb_target_group" "this" {
  name = "talentflow-ai-tg"

  port = 3000

  protocol = "HTTP"

  vpc_id = var.vpc_id

  target_type = "instance"

  health_check {
    enabled = true

    protocol = "HTTP"

    port = "3000"

    path = "/health"

    matcher = "200"

    interval = 30

    timeout = 5

    healthy_threshold = 2

    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-TargetGroup"
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn

  port = 80

  protocol = "HTTP"

  default_action {
    type = "forward"

    target_group_arn = aws_lb_target_group.this.arn
  }
}