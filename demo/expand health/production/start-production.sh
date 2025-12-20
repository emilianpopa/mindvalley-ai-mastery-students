#!/bin/bash

# ExpandHealth AI Copilot - Production Startup Script
# Starts the application with PM2 process manager

set -e

echo "=========================================="
echo "ExpandHealth AI Copilot - Starting"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Copy .env.template to .env and configure it first"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 not found. Installing globally..."
    sudo npm install -g pm2
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# PM2 ecosystem file (create if doesn't exist)
if [ ! -f ecosystem.config.js ]; then
    echo "Creating PM2 ecosystem configuration..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'expandhealth-copilot',
    script: './server.js',
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
fi

# Create logs directory
mkdir -p logs

# Stop existing process if running
pm2 stop expandhealth-copilot 2>/dev/null || true
pm2 delete expandhealth-copilot 2>/dev/null || true

# Start with PM2
echo "🚀 Starting ExpandHealth AI Copilot..."
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

echo ""
echo "=========================================="
echo "✅ Application Started Successfully"
echo "=========================================="
echo ""
echo "Status:"
pm2 status

echo ""
echo "Useful commands:"
echo "  pm2 status                     - Show status"
echo "  pm2 logs expandhealth-copilot  - View logs"
echo "  pm2 restart expandhealth-copilot - Restart app"
echo "  pm2 stop expandhealth-copilot  - Stop app"
echo "  pm2 monit                      - Monitor resources"
echo ""
echo "Application is running at: http://localhost:${PORT:-3000}"
echo ""
