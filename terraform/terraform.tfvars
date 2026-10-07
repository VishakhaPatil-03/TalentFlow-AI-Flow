aws_region  = "ap-south-1"
project_name = "TalentFlowAI"
environment  = "dev"

vpc_cidr = "10.0.0.0/16"

availability_zones = [
  "ap-south-1a",
  "ap-south-1b"
]

public_subnet_cidrs = [
  "10.0.1.0/24",
  "10.0.2.0/24"
]

private_app_subnet_cidrs = [
  "10.0.11.0/24",
  "10.0.12.0/24"
]

private_db_subnet_cidrs = [
  "10.0.21.0/24",
  "10.0.22.0/24"
]

admin_ip = "YOUR.PUBLIC.IP/32"

ami_id = "YOUR-UBUNTU-AMI-ID"

instance_type = "t3.micro"

key_name = "parag"

db_name = "talentflow"

db_username = "talentflow_app"

db_password = "CHANGE_THIS_PASSWORD"

desired_capacity = 2

min_size = 2

max_size = 4