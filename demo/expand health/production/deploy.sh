#!/bin/bash

# ExpandHealth AI Copilot - Deployment Script
# Automates deployment to production server

set -e  # Exit on error

echo "=========================================="
echo "ExpandHealth AI Copilot - Deployment"
echo "=========================================="
echo ""

# Configuration
APP_NAME="expandhealth-copilot"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_HOST="${DEPLOY_HOST:-your-server-ip}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/expandhealth-copilot}"
PM2_APP_NAME="expandhealth-copilot"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check required environment variables
if [ "$DEPLOY_HOST" = "your-server-ip" ]; then
    echo -e "${RED}❌ Error: DEPLOY_HOST not set${NC}"
    echo "Set it with: export DEPLOY_HOST=your.server.ip"
    exit 1
fi

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "  Server: $DEPLOY_USER@$DEPLOY_HOST"
echo "  Path: $DEPLOY_PATH"
echo "  App Name: $PM2_APP_NAME"
echo ""

# Confirm deployment
read -p "Deploy to production? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}🚀 Starting deployment...${NC}"
echo ""

# 1. Check .env file exists
echo "1️⃣  Checking environment configuration..."
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Copy .env.template to .env and configure it first"
    exit 1
fi
echo -e "${GREEN}✅ Environment file found${NC}"
echo ""

# 2. Install dependencies locally (optional check)
echo "2️⃣  Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi
echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

# 3. Create deployment archive
echo "3️⃣  Creating deployment package..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="deploy_${TIMESTAMP}.tar.gz"

tar -czf "$ARCHIVE_NAME" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='deploy_*.tar.gz' \
    server.js \
    dashboard.html \
    kb-manager.js \
    kb-config.json \
    kb-content/ \
    package.json \
    .env

echo -e "${GREEN}✅ Package created: $ARCHIVE_NAME${NC}"
echo ""

# 4. Upload to server
echo "4️⃣  Uploading to server..."
scp "$ARCHIVE_NAME" "$DEPLOY_USER@$DEPLOY_HOST:/tmp/"
echo -e "${GREEN}✅ Upload complete${NC}"
echo ""

# 5. Deploy on server
echo "5️⃣  Deploying on server..."
ssh "$DEPLOY_USER@$DEPLOY_HOST" << ENDSSH
set -e

# Create deployment directory if doesn't exist
sudo mkdir -p $DEPLOY_PATH
sudo chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH

# Extract archive
cd $DEPLOY_PATH
tar -xzf /tmp/$ARCHIVE_NAME

# Install dependencies
echo "Installing Node.js dependencies..."
npm install --production

# Setup PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing process if running
pm2 stop $PM2_APP_NAME || true
pm2 delete $PM2_APP_NAME || true

# Start application with PM2
echo "Starting application with PM2..."
pm2 start server.js --name $PM2_APP_NAME --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (only needs to be done once)
sudo pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER

# Cleanup
rm /tmp/$ARCHIVE_NAME

echo "Deployment complete!"
ENDSSH

echo -e "${GREEN}✅ Server deployment complete${NC}"
echo ""

# 6. Verify deployment
echo "6️⃣  Verifying deployment..."
sleep 3
HEALTH_CHECK=$(curl -s "http://$DEPLOY_HOST:3000/health" || echo "failed")

if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 Deployment Successful!${NC}"
    echo "=========================================="
    echo ""
    echo "Application is running at:"
    echo "  http://$DEPLOY_HOST:3000"
    echo ""
    echo "Next steps:"
    echo "  1. Configure reverse proxy (nginx/caddy)"
    echo "  2. Set up SSL certificate"
    echo "  3. Point DNS: copilot.expandhealth.ai -> $DEPLOY_HOST"
    echo ""
    echo "Useful commands:"
    echo "  ssh $DEPLOY_USER@$DEPLOY_HOST"
    echo "  pm2 status"
    echo "  pm2 logs $PM2_APP_NAME"
    echo "  pm2 restart $PM2_APP_NAME"
else
    echo -e "${YELLOW}⚠️  Health check failed or timed out${NC}"
    echo "Check logs with: ssh $DEPLOY_USER@$DEPLOY_HOST 'pm2 logs $PM2_APP_NAME'"
fi

# Cleanup local archive
rm "$ARCHIVE_NAME"
echo ""
echo "Deployment script completed."
