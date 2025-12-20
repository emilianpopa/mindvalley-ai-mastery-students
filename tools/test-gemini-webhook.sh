#!/bin/bash

#
# Test Gemini File Search Upload Webhook
#
# This script tests the imported N8N workflow webhook to ensure
# it's working correctly after import.
#
# Usage: ./test-gemini-webhook.sh [GEMINI_API_KEY] [STORE_ID]
#
# Example:
#   ./test-gemini-webhook.sh "your-api-key" "corpora/expandhealth-knowledge-base-zh869gf9ylhw"
#

WEBHOOK_URL="https://expandhealth.app.n8n.cloud/webhook/kb-upload-document"
GEMINI_API_KEY="${1:-}"
STORE_ID="${2:-corpora/expandhealth-knowledge-base-zh869gf9ylhw}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Gemini Upload Webhook Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Validate inputs
if [ -z "$GEMINI_API_KEY" ]; then
  echo -e "${RED}ERROR: Gemini API key not provided${NC}"
  echo ""
  echo "Usage: $0 [GEMINI_API_KEY] [STORE_ID]"
  echo ""
  echo "Example:"
  echo "  $0 'AIzaSy...' 'corpora/expandhealth-knowledge-base-zh869gf9ylhw'"
  echo ""
  exit 1
fi

echo -e "${YELLOW}Test Parameters:${NC}"
echo "  Webhook URL: $WEBHOOK_URL"
echo "  Store ID: $STORE_ID"
echo "  API Key: ${GEMINI_API_KEY:0:20}... (hidden)"
echo ""

# Create test document (base64 encoded text)
TEST_CONTENT="This is a test document from the webhook test script. If you see this in your Knowledge Base, the import was successful!"
CONTENT_BASE64=$(echo -n "$TEST_CONTENT" | base64)

echo -e "${YELLOW}Sending test request...${NC}"
echo ""

# Make the request
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"apiKey\": \"$GEMINI_API_KEY\",
    \"storeId\": \"$STORE_ID\",
    \"fileName\": \"test-webhook-$(date +%s).txt\",
    \"mimeType\": \"text/plain\",
    \"content\": \"$CONTENT_BASE64\"
  }")

echo -e "${BLUE}Response:${NC}"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parse response to check for success
if echo "$RESPONSE" | grep -q '"status":"SUCCESS"' || echo "$RESPONSE" | grep -q '"status": "SUCCESS"'; then
  echo -e "${GREEN}✅ SUCCESS! The workflow executed successfully.${NC}"
  echo ""
  echo "The document was uploaded to the Gemini Knowledge Base."
  echo "Operation ID: $(echo "$RESPONSE" | jq -r '.operationId' 2>/dev/null || echo "See response above")"
  echo ""
  exit 0
elif echo "$RESPONSE" | grep -q '"status":"ERROR"' || echo "$RESPONSE" | grep -q '"status": "ERROR"'; then
  echo -e "${RED}❌ WORKFLOW ERROR${NC}"
  echo ""
  echo "The workflow executed but returned an error:"
  echo "$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo "See response above")"
  echo ""
  exit 1
else
  echo -e "${YELLOW}⚠️  UNEXPECTED RESPONSE${NC}"
  echo ""
  echo "The webhook may not be active or properly imported."
  echo ""
  echo "Troubleshooting steps:"
  echo "  1. Go to https://expandhealth.app.n8n.cloud"
  echo "  2. Check if workflow 'Gemini File Search - Upload Document v2' exists"
  echo "  3. Make sure the toggle switch is ON (green)"
  echo "  4. Wait 10-15 seconds for webhook to register"
  echo "  5. Try again"
  echo ""
  exit 1
fi
