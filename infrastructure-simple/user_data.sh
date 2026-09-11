#!/bin/bash
set -e

# Update package repositories
apt-get update -y
apt-get upgrade -y

# Install essential dependencies
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    certbot \
    python3-certbot-nginx

# Setup 2GB Swap file for extra stability under peak load
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Add Docker's official GPG key & repository
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Docker Compose plugin
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable and start Docker service
systemctl enable docker
systemctl start docker

# Add default ubuntu user to docker group
usermod -aG docker ubuntu

# Create application directory
mkdir -p /app
chown -R ubuntu:ubuntu /app

echo "EC2 Simple Server Initialization Complete!" > /var/log/user_data_complete.log
