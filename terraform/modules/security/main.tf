# ==================================================
# ALB SECURITY GROUP
# ==================================================

resource "aws_security_group" "alb" {
  name = "${var.project_name}-ALB-SG"

  description = "Security group for TalentFlow ALB"

  vpc_id = var.vpc_id

  ingress {
    description = "HTTP"

    from_port = 80
    to_port   = 80

    protocol = "tcp"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }

  ingress {
    description = "HTTPS"

    from_port = 443
    to_port   = 443

    protocol = "tcp"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }

  egress {
    from_port = 0
    to_port   = 0

    protocol = "-1"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }

  tags = {
    Name = "${var.project_name}-ALB-SG"
  }
}

# ==================================================
# APPLICATION SECURITY GROUP
# ==================================================

resource "aws_security_group" "app" {
  name = "${var.project_name}-APP-SG"

  description = "Security group for TalentFlow backend"

  vpc_id = var.vpc_id

  ingress {
    description = "Application traffic from ALB"

    from_port = 3000
    to_port   = 3000

    protocol = "tcp"

    security_groups = [
      aws_security_group.alb.id
    ]
  }

  ingress {
    description = "SSH from administrator"

    from_port = 22
    to_port   = 22

    protocol = "tcp"

    cidr_blocks = [
      var.admin_ip
    ]
  }

  egress {
    from_port = 0
    to_port   = 0

    protocol = "-1"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }

  tags = {
    Name = "${var.project_name}-APP-SG"
  }
}

# ==================================================
# RDS SECURITY GROUP
# ==================================================

resource "aws_security_group" "rds" {
  name = "${var.project_name}-RDS-SG"

  description = "Security group for TalentFlow RDS"

  vpc_id = var.vpc_id

  ingress {
    description = "MySQL from application servers"

    from_port = 3306
    to_port   = 3306

    protocol = "tcp"

    security_groups = [
      aws_security_group.app.id
    ]
  }

  egress {
    from_port = 0
    to_port   = 0

    protocol = "-1"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }

  tags = {
    Name = "${var.project_name}-RDS-SG"
  }
}