resource "aws_db_subnet_group" "this" {
  name = "talentflow-ai-db-subnet-group"

  subnet_ids = var.db_subnet_ids

  tags = {
    Name = "${var.project_name}-DB-Subnet-Group"
  }
}

resource "aws_db_instance" "this" {
  identifier = "talentflow-ai-db"

  engine = "mysql"

  engine_version = "8.0"

  instance_class = "db.t3.micro"

  allocated_storage = 20

  max_allocated_storage = 50

  storage_type = "gp3"

  db_name = var.db_name

  username = var.db_username

  password = var.db_password

  port = 3306

  db_subnet_group_name = aws_db_subnet_group.this.name

  vpc_security_group_ids = [
    var.rds_security_group_id
  ]

  publicly_accessible = false

  storage_encrypted = true

  backup_retention_period = 7

  multi_az = false

  auto_minor_version_upgrade = true

  skip_final_snapshot = true

  deletion_protection = false

  tags = {
    Name = "${var.project_name}-RDS"
  }
}

resource "aws_secretsmanager_secret" "db" {
  name = "${var.project_name}/RDS"

  tags = {
    Name = "${var.project_name}-RDS-Secret"
  }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    database = var.db_name
    host     = aws_db_instance.this.address
    port     = 3306
  })
}