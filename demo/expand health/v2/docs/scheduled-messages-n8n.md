# Scheduled Messages - N8N Webhook Integration

## Overview

The Scheduled Messages feature allows clinicians to auto-generate and schedule check-in messages for clients based on their Engagement Plan phases.

## How It Works

1. **Clinician schedules messages** from the Engagement Plan editor
2. **Messages are stored** in the `scheduled_messages` database table with status `pending`
3. **N8N workflow polls** the `/api/scheduled-messages/due` endpoint periodically
4. **N8N sends messages** via WhatsApp/Email/SMS using configured integrations
5. **Status updated** to `sent` after successful delivery

## API Endpoints

### Get Due Messages (for n8n polling)
```
GET /api/scheduled-messages/due
Authorization: Bearer <token>
```

Returns messages that are scheduled for now or earlier and still pending.

### Send a Message (trigger from n8n)
```
POST /api/scheduled-messages/:messageId/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "delivery_status": "sent",
  "delivery_details": {
    "provider": "whatsapp",
    "message_id": "wamid.xxx"
  }
}
```

## N8N Workflow Setup

### Option 1: Scheduled Polling Workflow

1. Create a new workflow in n8n
2. Add a **Schedule Trigger** node (e.g., every 5 minutes)
3. Add an **HTTP Request** node to fetch due messages:
   - Method: GET
   - URL: `https://expandhealth-ai-copilot-production.up.railway.app/api/scheduled-messages/due`
   - Authentication: Header Auth
   - Header: `Authorization: Bearer <admin_token>`
4. Add a **Loop Over Items** node to process each message
5. Add a **Switch** node to route by channel (whatsapp/email/sms)
6. Add channel-specific nodes:
   - **WhatsApp**: Use WhatsApp Business API or Twilio
   - **Email**: Use SMTP or SendGrid
   - **SMS**: Use Twilio or similar
7. Add an **HTTP Request** to update message status after sending

### Option 2: Webhook Trigger (Real-time)

The API can call n8n directly when a message is due:

```javascript
// In api/scheduled-messages.js, the send endpoint posts to:
N8N_WEBHOOK_URL/webhook/send-scheduled-message
```

Configure `N8N_WEBHOOK_URL` in Railway environment variables.

## Message Structure

Each scheduled message contains:
- `id` - Unique message ID
- `client_id` - Client to send to
- `channel` - whatsapp, email, or sms
- `message_content` - The message text
- `scheduled_for` - When to send
- `message_type` - check_in, phase_start, reminder, follow_up, custom
- `engagement_plan_id` - Related engagement plan
- `phase_number` - Which phase this relates to

## Client Contact Information

To send the message, you'll need the client's contact info:
```
GET /api/clients/:clientId
```

Returns `phone` and `email` fields.

## Environment Variables

Add to Railway:
```
N8N_WEBHOOK_URL=https://your-n8n-instance.app.n8n.cloud
```
