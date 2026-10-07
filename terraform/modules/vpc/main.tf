resource "aws_vpc" "this" {
  cidr_block = var.vpc_cidr

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-VPC"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.project_name}-IGW"
  }
}

# ==================================================
# PUBLIC SUBNETS
# ==================================================

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id = aws_vpc.this.id

  cidr_block = var.public_subnet_cidrs[count.index]

  availability_zone = var.availability_zones[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-Public-${count.index + 1}"
  }
}

# ==================================================
# PRIVATE APP SUBNETS
# ==================================================

resource "aws_subnet" "private_app" {
  count = length(var.private_app_subnet_cidrs)

  vpc_id = aws_vpc.this.id

  cidr_block = var.private_app_subnet_cidrs[count.index]

  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-Private-App-${count.index + 1}"
  }
}

# ==================================================
# PRIVATE DB SUBNETS
# ==================================================

resource "aws_subnet" "private_db" {
  count = length(var.private_db_subnet_cidrs)

  vpc_id = aws_vpc.this.id

  cidr_block = var.private_db_subnet_cidrs[count.index]

  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.project_name}-Private-DB-${count.index + 1}"
  }
}

# ==================================================
# PUBLIC ROUTE TABLE
# ==================================================

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"

    gateway_id = aws_internet_gateway.this.id
  }

  tags = {
    Name = "${var.project_name}-Public-RT"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id = aws_subnet.public[count.index].id

  route_table_id = aws_route_table.public.id
}

# ==================================================
# NAT GATEWAY
# ==================================================

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-NAT-EIP"
  }
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id

  subnet_id = aws_subnet.public[0].id

  depends_on = [
    aws_internet_gateway.this
  ]

  tags = {
    Name = "${var.project_name}-NAT"
  }
}

# ==================================================
# PRIVATE APP ROUTE TABLE
# ==================================================

resource "aws_route_table" "private_app" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"

    nat_gateway_id = aws_nat_gateway.this.id
  }

  tags = {
    Name = "${var.project_name}-Private-App-RT"
  }
}

resource "aws_route_table_association" "private_app" {
  count = length(aws_subnet.private_app)

  subnet_id = aws_subnet.private_app[count.index].id

  route_table_id = aws_route_table.private_app.id
}

# ==================================================
# PRIVATE DB ROUTE TABLE
# ==================================================

resource "aws_route_table" "private_db" {
  vpc_id = aws_vpc.this.id

  tags = {
    Name = "${var.project_name}-Private-DB-RT"
  }
}

resource "aws_route_table_association" "private_db" {
  count = length(aws_subnet.private_db)

  subnet_id = aws_subnet.private_db[count.index].id

  route_table_id = aws_route_table.private_db.id
}