#!/bin/bash
# ExpandHealth V2 Deployment Script
# This script commits, pushes to GitHub, and deploys to Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ExpandHealth V2 Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}Error: Must run from demo/expand health/v2 directory${NC}"
    exit 1
fi

# Step 1: Check for uncommitted changes
echo -e "\n${YELLOW}Step 1: Checking git status...${NC}"
if git diff --quiet && git diff --cached --quiet; then
    echo "No changes to commit"
else
    echo "Found uncommitted changes"
    git status --short

    # Ask for commit message if not provided
    if [ -z "$1" ]; then
        echo -e "\n${YELLOW}Enter commit message (or press Enter for auto-message):${NC}"
        read -r COMMIT_MSG
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="Update ExpandHealth V2 - $(date '+%Y-%m-%d %H:%M')"
        fi
    else
        COMMIT_MSG="$1"
    fi

    # Commit changes
    echo -e "\n${YELLOW}Step 2: Committing changes...${NC}"
    git add -A
    git commit -m "$COMMIT_MSG"
fi

# Step 3: Push to GitHub
echo -e "\n${YELLOW}Step 3: Pushing to GitHub (expandhealthai/staging)...${NC}"
git push expandhealthai staging

# Step 4: Deploy to Railway
echo -e "\n${YELLOW}Step 4: Deploying to Railway...${NC}"
railway up --service expandhealth-ai-copilot --detach

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment initiated!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "GitHub: https://github.com/emilianpopa/expandhealthai/tree/staging"
echo -e "Railway: https://expandhealth-ai-copilot-staging.up.railway.app"
echo -e "\nNote: Railway deployment takes ~1-2 minutes to complete."
