#!/bin/sh
set -e

echo "Starting application..."
# Use exec to ensure the Node process receives SIGTERM signals from ECS for graceful shutdown
exec node dist/main
