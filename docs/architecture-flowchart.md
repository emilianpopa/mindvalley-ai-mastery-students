# MindValley AI Mastery Architecture Guide

## Understanding The Stacks, N8N, Gemini KB, and AI Agents

---

## 🎯 The Big Picture: Two Separate Systems

There are **TWO INDEPENDENT SYSTEMS** that people often confuse:

### System 1: Knowledge Base Management (Upload/Delete Documents)
**Purpose**: Get documents INTO the Gemini knowledge base

### System 2: AI Agent Workflows (Query Documents)
**Purpose**: Use AI agents to READ from the knowledge base and help customers

**KEY INSIGHT**: You can bypass N8N for System 1 (uploading) and still use N8N for System 2 (AI agents)!

---

## 📊 Architecture Flowchart

### SYSTEM 1: Knowledge Base Management (Document Upload/Delete)

```
┌─────────────────────────────────────────────────────────────────┐
│  ORIGINAL ARCHITECTURE (The Stacks - BROKEN)                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  The Stacks UI   │  ← User uploads document
│ localhost:3000   │
└────────┬─────────┘
         │ HTTP POST
         ↓
┌────────────────────────────────────┐
│  N8N Webhook                       │
│  /webhook/kb-upload-document       │
└────────┬───────────────────────────┘
         │ Workflow processes request
         ↓
┌────────────────────────────────────┐
│  N8N Workflow Node: HTTP Request   │
│  → POST /v1beta/corpora/{id}/docs  │  ← OLD API (BROKEN)
└────────┬───────────────────────────┘
         │ ❌ Returns 404 Error
         ↓
┌────────────────────────────────────┐
│  Google Gemini File Search API     │
│  (Rejects old endpoint)            │
└────────────────────────────────────┘

Result: ❌ ERROR - "Error in workflow"


┌─────────────────────────────────────────────────────────────────┐
│  NEW ARCHITECTURE (Uploader UI - WORKING)                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Uploader UI     │  ← User uploads document
│ localhost:3001   │
└────────┬─────────┘
         │ Direct HTTPS call (JavaScript fetch)
         │ Bypasses N8N completely!
         ↓
┌────────────────────────────────────────────────────────────────┐
│  Google Gemini File Search API (NEW ENDPOINT)                  │
│  POST /v1beta/fileSearchStores/{id}:uploadToFileSearchStore   │
└────────┬───────────────────────────────────────────────────────┘
         │ ✅ Success!
         ↓
┌────────────────────────────────────┐
│  Document stored in Knowledge Base │
│  fileSearchStores/expandhealth-... │
└────────────────────────────────────┘

Result: ✅ SUCCESS - Document uploaded!


┌─────────────────────────────────────────────────────────────────┐
│  FIXED N8N WORKFLOW (Optional - for automation)                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Any Client      │  ← Could be: The Stacks, cron job, webhook
│  (curl, UI, etc) │
└────────┬─────────┘
         │ HTTP POST
         ↓
┌────────────────────────────────────┐
│  N8N Webhook                       │
│  /webhook/kb-upload-document       │
└────────┬───────────────────────────┘
         │ Workflow processes request
         ↓
┌────────────────────────────────────────────────────────────────┐
│  N8N Workflow Node: HTTP Request (FIXED)                       │
│  → POST /v1beta/fileSearchStores/{id}:uploadToFileSearchStore │  ← NEW API!
└────────┬───────────────────────────────────────────────────────┘
         │ ✅ Success!
         ↓
┌────────────────────────────────────┐
│  Google Gemini File Search API     │
│  (Accepts new endpoint)            │
└────────┬───────────────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  Document stored in Knowledge Base │
└────────────────────────────────────┘

Result: ✅ SUCCESS - N8N automation works!
```

---

## SYSTEM 2: AI Agent Workflows (Customer Service)

```
┌─────────────────────────────────────────────────────────────────┐
│  EMAIL-BASED CUSTOMER SERVICE AGENT (From MindValley Course)   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  Customer Email  │  "What are your office hours?"
└────────┬─────────┘
         │
         ↓
┌────────────────────────────────────┐
│  Gmail (Watches inbox via API)     │
└────────┬───────────────────────────┘
         │ Email trigger
         ↓
┌────────────────────────────────────────────────────────────┐
│  N8N Workflow: "Email Sugar Agent"                         │
│                                                             │
│  Node 1: Gmail Trigger (new email arrives)                 │
│  Node 2: Extract email content                             │
│  Node 3: Query Gemini KB for relevant info                 │
│  Node 4: Send to Claude API (draft response)               │
│  Node 5: Human review (send to Slack/Email)                │
│  Node 6: If approved → Send email response                 │
└────────┬───────────────────────────────────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ↓                 ↓
┌────────────────┐  ┌─────────────────────────────────────┐
│  Gemini KB     │  │  Claude API (Anthropic)             │
│  Query API     │  │  - Generates response               │
│                │  │  - Uses KB context                  │
│  Returns:      │  │  - Applies brand voice              │
│  - FAQ info    │  └─────────────────────────────────────┘
│  - Policies    │
│  - Locations   │
└────────────────┘
         │
         ↓
┌────────────────────────────────────┐
│  Draft Response (Human-in-Loop)    │
│  → Sent to doctor/admin for review │
└────────┬───────────────────────────┘
         │ ✅ Approved
         ↓
┌────────────────────────────────────┐
│  Gmail: Send Response to Customer  │
└────────────────────────────────────┘

Result: ✅ Customer gets accurate, brand-aligned response!
```

---

## 🔍 Key Insight: Upload vs Query

### Upload Documents (System 1)
- **Does NOT require N8N** if you use the uploader UI
- **Direct API call** to Google Gemini
- **One-time or manual operation**
- Your uploader UI does this perfectly!

### Query Documents (System 2)
- **DOES require N8N** for workflow orchestration
- **Combines multiple services**: Gmail → Gemini KB → Claude API → Human Review → Gmail
- **Automated, triggered workflows**
- This is where N8N shines!

---

## 📋 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXPANDHEALTH AI SYSTEM                                │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────┐
│  KNOWLEDGE BASE LAYER                 │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ Gemini File Search Store        │ │
│  │ expandhealth-knowledge-base     │ │
│  │                                 │ │
│  │ Documents:                      │ │
│  │ • Brand Voice                   │ │
│  │ • FAQ                           │ │
│  │ • Locations                     │ │
│  │ • Menu/Services                 │ │
│  │ • Policies                      │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Managed by:                          │
│  • Uploader UI (localhost:3001) ✅    │
│  • CLI tools ✅                       │
│  • N8N workflows (optional)           │
└───────────────────────────────────────┘
                  ↑
                  │ Documents uploaded here
                  │
┌─────────────────┴─────────────────────────────────────────────────┐
│  DOCUMENT MANAGEMENT (You choose one method)                      │
│                                                                    │
│  Option A: Direct Upload (Current - Working!)                     │
│  ┌────────────────┐                                               │
│  │ Uploader UI    │ → Direct API → Gemini KB ✅                   │
│  └────────────────┘                                               │
│                                                                    │
│  Option B: Via N8N (Optional)                                     │
│  ┌────────────────┐                                               │
│  │ The Stacks UI  │ → N8N Webhook → Gemini KB                     │
│  └────────────────┘    (needs workflow import)                    │
└────────────────────────────────────────────────────────────────────┘

                  ↓ Documents are queryable

┌────────────────────────────────────────────────────────────────────┐
│  AI AGENT WORKFLOWS (N8N Required!)                                │
│                                                                    │
│  Workflow 1: Email Customer Service                               │
│  ┌──────┐   ┌─────┐   ┌────────┐   ┌───────┐   ┌──────┐         │
│  │Gmail │→│N8N  │→│Gemini  │→│Claude │→│Human │→ Reply         │
│  │Inbox │   │Agent│   │KB Query│   │API    │   │Review│         │
│  └──────┘   └─────┘   └────────┘   └───────┘   └──────┘         │
│                                                                    │
│  Workflow 2: Treatment Plan Generator                             │
│  ┌──────────┐   ┌─────┐   ┌────────┐   ┌───────┐                │
│  │Blood Test│→│N8N  │→│Gemini  │→│Claude │→ PDF Report        │
│  │Upload    │   │Flow │   │KB Query│   │API    │                │
│  └──────────┘   └─────┘   └────────┘   └───────┘                │
│                                                                    │
│  Workflow 3: Appointment Scheduler                                │
│  ┌──────────┐   ┌─────┐   ┌────────┐   ┌───────┐                │
│  │Form      │→│N8N  │→│Gemini  │→│Calendar│→ Confirmation     │
│  │Submission│   │Flow │   │KB Query│   │API    │                │
│  └──────────┘   └─────┘   └────────┘   └───────┘                │
└────────────────────────────────────────────────────────────────────┘
```

---

## ✅ How MindValley Workflows Still Work

### Question: "If we bypass N8N for uploads, how do the MindValley agent workflows work?"

**Answer**: They work perfectly! Here's why:

### 1. **Upload and Query are SEPARATE operations**

```
UPLOAD (one-time):
You → Uploader UI → Google Gemini
(N8N not involved) ✅

QUERY (ongoing):
Customer → Gmail → N8N → Gemini KB → Claude → Response
(N8N orchestrates this) ✅
```

### 2. **The Knowledge Base is just a database**

Once documents are in Gemini KB, it doesn't matter HOW they got there:
- Uploaded via N8N? ✅ Works
- Uploaded via Uploader UI? ✅ Works
- Uploaded via curl? ✅ Works
- Uploaded via Google AI Studio? ✅ Works

**They all end up in the same place!**

### 3. **N8N workflows QUERY the KB, they don't manage it**

The MindValley agent workflows do this:

```javascript
// In your N8N workflow "Email Sugar Agent"

Node 1: Receive email from customer
Node 2: Extract question: "What are your office hours?"
Node 3: Query Gemini KB (READ operation)
        ↓
        const response = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent',
          {
            body: {
              contents: [{ text: "What are office hours?" }],
              tools: [{
                retrieval: {
                  fileSearchStores: ["expandhealth-knowledge-base"]
                }
              }]
            }
          }
        );
        ↓
        Returns: "Office hours are Mon-Fri 9am-5pm"

Node 4: Send to Claude API to draft response
Node 5: Human reviews
Node 6: Send email
```

**Notice**: The workflow only READS from the KB. It doesn't upload!

---

## 🎓 MindValley Course Architecture

### What The Course Teaches:

```
SESSION 1: Knowledge Base Setup
├─ Create Gemini KB store
├─ Upload initial documents (brand voice, FAQ, etc.)
└─ The Stacks UI for management (optional - you can use uploader UI instead!)

SESSION 2: Human-in-Loop Workflows
├─ Build N8N workflow: Email → KB Query → Claude → Human Review → Reply
├─ Gmail integration
└─ Slack approval flows

SESSION 3: Advanced Agents
├─ Multi-step agents (treatment plans)
├─ Document ingestion workflows
└─ Automated responses
```

### Where Each Tool Fits:

| Tool | Used For | Required? |
|------|----------|-----------|
| **Gemini KB** | Store documents | ✅ Yes |
| **Uploader UI** | Upload documents | ✅ Yes (or use N8N) |
| **N8N** | Orchestrate AI agents | ✅ Yes (for agents) |
| **Claude API** | Generate responses | ✅ Yes |
| **Gmail API** | Read customer emails | ✅ Yes (for email agents) |
| **The Stacks** | Upload documents | ❌ No (use uploader UI) |

---

## 🔄 Data Flow Example: Customer Service Email

```
1. Customer sends email: "What's your cancellation policy?"
   ↓
2. Gmail API detects new email
   ↓
3. N8N Workflow triggered (Email Sugar Agent)
   ↓
4. N8N extracts email content
   ↓
5. N8N queries Gemini KB:
   Request: "What is ExpandHealth's cancellation policy?"
   Response: [Returns relevant section from policies.md document]
   ↓
6. N8N sends KB context + question to Claude API:
   Prompt: "You are ExpandHealth's assistant. Using this policy info,
           draft a friendly response to the customer..."
   ↓
7. Claude generates draft response in ExpandHealth's brand voice
   ↓
8. N8N sends draft to Slack for doctor approval
   ↓
9. Doctor clicks "Approve" in Slack
   ↓
10. N8N sends email via Gmail API
   ↓
11. Customer receives accurate, brand-aligned response! ✅
```

**Note**: The KB documents (uploaded via uploader UI) are used in step 5-6, but the upload process is completely separate from this workflow!

---

## 💡 Key Takeaways

### 1. **Two Independent Systems**
- **System A**: Upload documents to KB (use uploader UI)
- **System B**: AI agents query KB (use N8N workflows)

### 2. **You Can Mix and Match**
- Upload via uploader UI ✅
- Query via N8N workflows ✅
- Both work together perfectly!

### 3. **The Knowledge Base is the Bridge**
- Documents go IN (via any method)
- Agents pull OUT (via Gemini API in N8N)
- They don't need to use the same path!

### 4. **N8N's Real Value**
- Not for uploading documents (you have uploader UI for that)
- FOR orchestrating complex multi-step AI workflows
- Email → Query KB → Generate response → Human review → Send

### 5. **Your Setup is Actually Better!**
- Simple uploads: Direct UI ✅
- Complex agents: N8N workflows ✅
- Best of both worlds!

---

## 🚀 Next Steps for Your ExpandHealth Project

1. ✅ **Documents uploaded** (using uploader UI)
2. ✅ **Knowledge base working**
3. ⏭️ **Build N8N agent workflows** to:
   - Read customer emails
   - Query your KB
   - Draft responses with Claude
   - Get doctor approval
   - Send replies

The KB is ready - now build the agents that USE it! 🎉
