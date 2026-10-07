#!/bin/bash

set -e

apt-get update -y

apt-get install -y \
  curl \
  git \
  unzip

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -

apt-get install -y nodejs

mkdir -p /opt/talentflow

chown -R ubuntu:ubuntu /opt/talentflow

cd /opt/talentflow

git clone https://github.com/VishakhaPatil-03/TalentFlow-AI-Flow.git .

cd backend

npm install

cat > /etc/systemd/system/talentflow.service <<'EOF'

[Unit]
Description=TalentFlow AI Backend
After=network.target

[Service]
WorkingDirectory=/opt/talentflow/backend

ExecStart=/usr/bin/node server.js

Restart=always

RestartSec=5

User=ubuntu

Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target

EOF

systemctl daemon-reload

systemctl enable talentflow

systemctl start talentflow