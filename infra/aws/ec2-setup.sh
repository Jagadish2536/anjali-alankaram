#!/bin/bash
# EC2 Setup Script for Amazon Linux 2023 / Ubuntu 22.04
# Run this on a fresh EC2 t3.medium instance

# Update system
sudo yum update -y || sudo apt update -y

# Install Docker
if [ -x "$(command -v yum)" ]; then
  sudo yum install -y docker
  sudo service docker start
  sudo usermod -a -G docker ec2-user
elif [ -x "$(command -v apt)" ]; then
  sudo apt install -y docker.io
  sudo systemctl start docker
  sudo systemctl enable docker
  sudo usermod -a -G docker ubuntu
fi

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install -y git || sudo apt install -y git

# Create app directory
mkdir -p /home/ec2-user/anjali-alankaram || mkdir -p /home/ubuntu/anjali-alankaram

echo "=================================================="
echo "Setup complete! Please log out and log back in for Docker group permissions to take effect."
echo "Then clone your repository and run 'docker-compose -f docker-compose.prod.yml up -d'"
echo "=================================================="
