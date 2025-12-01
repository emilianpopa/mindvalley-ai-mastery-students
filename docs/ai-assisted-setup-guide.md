# AI-Assisted Setup Guide for MindValley AI Mastery

> **Version:** 1.0
> **Course:** MindValley AI Mastery (December 2025)
> **Last Updated:** December 1, 2025

---

## HOW TO USE THIS GUIDE

Add this document to an AI assistant so it can help you with any setup issues:

**Claude Desktop:**
1. Open Claude Desktop app
2. Click Settings (gear icon) → Projects
3. Create a new project called "AI Mastery Setup"
4. Click "Add to project knowledge" → Upload this file

**ChatGPT:**
1. Go to chat.openai.com
2. Click "Explore GPTs" → "Create"
3. Upload this file to the Knowledge section
4. Or simply paste sections into a chat when you need help

**Claude.ai (web):**
1. Start a new chat at claude.ai
2. Click the attachment icon
3. Upload this file
4. Then ask your question

**Then ask:** "Help me complete my MindValley AI Mastery setup. I'm on [step X] and seeing [error]."

---

## COURSE CONTEXT

### What You're Building
A complete AI-powered customer service system that:
- Receives customer emails automatically
- Uses AI to draft professional responses
- Retrieves knowledge from your business documents
- Escalates to humans when AI is uncertain
- Learns and improves over time

### Why These Specific Tools

| Tool | Purpose | Why We Chose It |
|------|---------|-----------------|
| **N8N** | Workflow automation | Visual builder, no coding required, AI nodes built-in |
| **Gemini File Search** | Knowledge base | Free tier, Google integration, semantic search |
| **Claude/ChatGPT** | AI assistance | Helps you build without coding |
| **VS Code + Claude Code** | Configuration | AI writes configs for you |
| **Slack** | Human escalation | Real-time alerts when AI needs help |
| **Google Sheets** | Simple database | Easy to view, no setup required |
| **Gmail** | Email processing | Common, well-integrated |

### What "Non-Technical" Means Here
You do NOT need to know:
- Programming languages
- Database management
- Server administration
- Command line expertise

You WILL learn to:
- Copy-paste commands
- Follow step-by-step instructions
- Use AI to help when stuck

---

## REQUIRED ACCOUNTS CHECKLIST

Complete all 9 items BEFORE Session 1 (Dec 3, 2025).

**Estimated total time:** 45-60 minutes

### Account 1: GitHub (Free)
**Purpose:** Download course materials

1. Go to [github.com](https://github.com)
2. Click "Sign up"
3. Enter email, create password, choose username
4. Verify your email (check inbox)
5. Save your username and password

**Verify:** You can log in at github.com

---

### Account 2: N8N Cloud (Paid - ~$20-50/month)
**Purpose:** Your automation platform (this is where the magic happens)

1. Go to [n8n.cloud](https://n8n.cloud)
2. Click "Start for free"
3. Create account with email
4. **IMPORTANT:** Choose the **Starter** plan (free tier won't work - you need AI Workflow Builder access)
5. Complete account verification

**Verify:** You have a URL like `https://your-name.app.n8n.cloud`

**If you see "Upgrade required" errors later:** You need to upgrade from the free tier to Starter.

---

### Account 3: Google AI Studio (Free)
**Purpose:** Knowledge base AI

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with any Google account
3. Accept terms of service
4. Click "Get API Key" button (left sidebar)
5. Click "Create API key"
6. Copy the key and save it somewhere safe

**Key format:** About 40 characters, starts with `AIza...`

**Verify:** You have an API key copied and saved

---

### Account 4: Gmail (Free)
**Purpose:** Testing email workflows

We recommend a **separate test account** (not your main inbox).

1. Go to [accounts.google.com](https://accounts.google.com)
2. Click "Create account"
3. Fill in details
4. Verify phone number

**Verify:** You can send and receive emails from this account

---

### Account 5: Google Sheets (Free)
**Purpose:** Simple database for tracking

1. Go to [sheets.google.com](https://sheets.google.com)
2. Sign in with your Google account
3. Create a blank spreadsheet to verify access

**Verify:** You can create and edit a spreadsheet

---

### Account 6: Slack Workspace (Free)
**Purpose:** Human-in-the-loop notifications

**Option A: Use Course Workspace** (Tyler will provide invite link)

**Option B: Create Your Own** (for testing)
1. Go to [slack.com/create](https://slack.com/create)
2. Enter your email
3. Follow the setup wizard
4. Create a channel called `#customer-service-hitl`

**Verify:** You can post messages in a Slack channel

---

### Account 7: AI Assistant Subscription ($20/month)
**Purpose:** Your AI helper for building

**Choose ONE:**

**Option A: Claude Pro (Recommended)**
1. Go to [claude.ai](https://claude.ai)
2. Sign up for account
3. Click "Upgrade to Pro" ($20/month)
4. Download Claude Desktop from [claude.ai/download](https://claude.ai/download)

**Option B: ChatGPT Plus**
1. Go to [chat.openai.com](https://chat.openai.com)
2. Sign up for account
3. Click "Upgrade to Plus" ($20/month)

**Verify:** You can start a conversation and get responses

---

### Account 8: LLM API Key for N8N (Pay-as-you-go, ~$5-15 total)
**Purpose:** Connects AI models to your workflows

**We recommend OpenRouter because:**
- No rate limits for new accounts
- Works immediately
- Access to multiple AI models
- Simple pricing

**OpenRouter Setup (Recommended):**
1. Go to [openrouter.ai](https://openrouter.ai)
2. Click "Sign In" → Sign up
3. Click your profile → "Credits"
4. Add $5-10 credit
5. Click your profile → "Keys"
6. Click "Create Key"
7. Name it "N8N MindValley"
8. Copy the key (starts with `sk-or-...`)
9. **Save this key immediately** - you won't see it again!

**Alternative: Claude API**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up
3. Add payment method + $5 credit
4. Create API key (starts with `sk-ant-...`)
⚠️ Warning: New accounts have rate limits

**Alternative: OpenAI API**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up
3. Add payment method + $5 credit
4. Create API key (starts with `sk-...`)
⚠️ Warning: New accounts have rate limits

**Verify:** You have an API key saved securely

---

### Account 9: VS Code + Claude Code Extension (Free)
**Purpose:** AI-assisted configuration

**VS Code:**
1. Go to [code.visualstudio.com](https://code.visualstudio.com)
2. Download for your operating system (Mac, Windows, or Linux)
3. Install the application
4. Launch to verify it opens

**Claude Code Extension:**
1. Open VS Code
2. Click the Extensions icon (four squares) in left sidebar
   - Or press: Mac: `Cmd+Shift+X` / Windows: `Ctrl+Shift+X`
3. Search for "Claude Code"
4. Click Install
5. Sign in with your Claude account when prompted

**Verify:** You see the Claude Code icon in VS Code sidebar

---

## ACCOUNT CHECKLIST SUMMARY

Before proceeding, confirm you have:

- [ ] GitHub account (free)
- [ ] N8N Cloud account (Starter tier, ~$20-50/month)
- [ ] Google AI Studio API key saved
- [ ] Gmail test account
- [ ] Google Sheets access verified
- [ ] Slack workspace access
- [ ] Claude Pro OR ChatGPT Plus subscription
- [ ] OpenRouter (or Claude/OpenAI) API key saved
- [ ] VS Code installed with Claude Code extension

**Total monthly cost:** ~$50-85/month during course + ~$5-15 one-time API usage

---

## STEP-BY-STEP SETUP

Complete these steps in order after creating all accounts above.

### Phase 1: Repository Setup

#### Step 1.1: Open Terminal

**Mac:**
1. Press `Cmd + Space` to open Spotlight
2. Type "Terminal"
3. Press Enter

**Windows:**
1. Press `Windows key`
2. Type "Command Prompt" or "PowerShell"
3. Press Enter

**Linux:**
1. Press `Ctrl + Alt + T`
   - Or search for "Terminal" in applications

**What is a terminal?** It's a text-based way to give your computer commands. Don't worry - you'll only copy-paste what we provide.

---

#### Step 1.2: Clone the Repository

Copy and paste this command into your terminal:

```bash
git clone https://github.com/8Dvibes/mindvalley-ai-mastery-students.git
```

Press Enter.

**Expected output:**
```
Cloning into 'mindvalley-ai-mastery-students'...
remote: Enumerating objects: done.
...
Receiving objects: 100% (XX/XX), done.
```

---

#### Step 1.3: Navigate to the Folder

```bash
cd mindvalley-ai-mastery-students
```

Press Enter.

---

#### Step 1.4: Verify Structure

**Mac/Linux:**
```bash
ls -la
```

**Windows:**
```bash
dir
```

**You should see:**
```
SETUP.md
ONBOARDING.md
setup.sh
docs/
workflows/
```

If you see these files, move to Phase 2!

---

### Phase 2: Run Setup Verification

#### Step 2.1: Make Setup Script Executable (Mac/Linux only)

```bash
chmod +x setup.sh
```

**Windows users:** Skip this step.

---

#### Step 2.2: Run Setup Script

**Mac/Linux:**
```bash
./setup.sh
```

**Windows:**
```bash
bash setup.sh
```

If `bash` isn't recognized on Windows, install Git Bash from [git-scm.com](https://git-scm.com/downloads) and run the command from Git Bash.

**Expected output:**
```
========================================
  MindValley AI Mastery - Setup Check
========================================

Checking directory structure...
   ✓ docs/ exists
   ✓ workflows/ exists

Checking required files...
   ✓ SETUP.md
   ✓ ONBOARDING.md

✅ Setup verified! You're ready for Step 3.
```

---

### Phase 3: AI Assistant Setup

#### For Claude Pro Users:

**Step 3.1: Configure Claude Desktop**
1. Launch Claude Desktop app
2. Click the folder icon (bottom-left) or Settings → Projects
3. Click "Create Project"
4. Name it "AI Mastery"
5. Click "Add to project knowledge"
6. Navigate to your `mindvalley-ai-mastery-students` folder
7. Upload `docs/claude-desktop-instructions.txt`

**Step 3.2: Verify**
- You should see "AI Mastery" in your projects sidebar
- Start a new chat within this project
- Claude now has your course context

---

#### For ChatGPT Plus Users:

**Step 3.1: Upload Context**
1. Go to chat.openai.com
2. Start a new chat
3. Click the attachment icon
4. Upload `docs/claude-desktop-instructions.txt` from your repo folder
5. Ask: "Please read this context file so you understand my course setup"

**Step 3.2: Bookmark**
- Bookmark this conversation for future reference
- Or: Create a Custom GPT with this file in knowledge base

---

### Phase 4: VS Code + Claude Code Setup

#### Step 4.1: Open Project in VS Code
1. Launch VS Code
2. File → Open Folder (Mac: `Cmd+O`, Windows: `Ctrl+K Ctrl+O`)
3. Navigate to `mindvalley-ai-mastery-students`
4. Click "Open"

---

#### Step 4.2: Verify Claude Code Extension
1. Look for the Claude Code icon in the left sidebar (speech bubble icon)
2. Click it to open the Claude Code panel
3. If prompted, sign in with your Claude account

---

#### Step 4.3: Test Claude Code
In the Claude Code input box at the bottom, type:
```
/help
```

**Expected:** A help menu appears with available commands.

---

### Phase 5: N8N Configuration

#### Step 5.1: Log into N8N Cloud
1. Go to your N8N URL (e.g., `https://your-name.app.n8n.cloud`)
2. Log in with your credentials
3. You should see the N8N workflow editor

---

#### Step 5.2: Import Test Workflow
1. Click **"Add workflow"** (or the + button)
2. Click the **three dots menu (⋯)** → **"Import from file"**
3. Navigate to your cloned repo
4. Select `workflows/00-test-connection.json`
5. Click Open

---

#### Step 5.3: Run Test Workflow
1. You should see a simple workflow with a few nodes
2. Click **"Test workflow"** button (play icon at bottom)
3. The workflow executes immediately

---

#### Step 5.4: Verify Success

Look at the output panel. You should see:
```json
{
  "message": "Hello from N8N!",
  "status": "connected",
  "workflow": "Test Connection Successful"
}
```

If you see this, your N8N is working!

---

### Phase 6: Gemini API Verification

#### Step 6.1: Test Your API Key

Open terminal and run this command (replace `YOUR_API_KEY` with your actual key):

**Mac/Linux:**
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say hello in exactly 3 words"}]}]}'
```

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" -Method POST -ContentType "application/json" -Body '{"contents":[{"parts":[{"text":"Say hello in exactly 3 words"}]}]}'
```

**Windows (Command Prompt):** Use PowerShell instead, or install curl.

---

#### Step 6.2: Verify Response

**Expected output (something like):**
```json
{
  "candidates": [{
    "content": {
      "parts": [{"text": "Hello to you!"}]
    }
  }]
}
```

If you get a response with text, your Gemini API key works!

---

### Phase 7: Final Verification Checklist

Confirm all of these work:

- [ ] Repository cloned and setup.sh passes
- [ ] Claude Desktop/ChatGPT has project context
- [ ] VS Code opens the project folder
- [ ] Claude Code extension responds to /help
- [ ] N8N test workflow runs successfully
- [ ] Gemini API returns a response

**If all boxes are checked: You're ready for Session 1!**

---

## TROUBLESHOOTING DATABASE

### Git Issues

#### "git: command not found"

**What it means:** Git isn't installed on your computer.

**Fix - Mac:**
1. Open Terminal
2. Run: `xcode-select --install`
3. Click "Install" when prompted
4. Wait for installation (may take 10+ minutes)
5. Close and reopen Terminal
6. Try the git command again

**Fix - Windows:**
1. Go to [git-scm.com/downloads](https://git-scm.com/downloads)
2. Download the Windows installer
3. Run the installer (accept all defaults)
4. Close and reopen Command Prompt
5. Try the git command again

**Fix - Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install git
```

**Fix - Linux (Fedora):**
```bash
sudo dnf install git
```

---

#### "Repository not found"

**What it means:** The URL is wrong, or you don't have access.

**Fix:**
1. Double-check the URL spelling exactly:
   ```
   https://github.com/8Dvibes/mindvalley-ai-mastery-students.git
   ```
2. Try opening the URL in your browser - you should see the repository
3. If "404 Not Found" in browser: Ask Tyler for repository access in Slack
4. If browser works but git doesn't: Check your internet connection

---

#### "Permission denied (publickey)"

**What it means:** Git is trying to use SSH authentication but you don't have keys set up.

**Fix (use HTTPS instead):**
```bash
git clone https://github.com/8Dvibes/mindvalley-ai-mastery-students.git
```

Make sure the URL starts with `https://` not `git@`.

---

#### "Permission denied" when running setup.sh

**What it means:** The script doesn't have permission to execute.

**Fix - Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Fix - Windows:**
Run from Git Bash instead of Command Prompt, or use:
```bash
bash setup.sh
```

---

### N8N Issues

#### "Workflow import failed"

**What it means:** The JSON file couldn't be read, or your N8N plan doesn't support the features.

**Fixes to try:**
1. **Check your N8N plan:** You need Starter tier (not free)
   - Go to N8N Settings → Billing
   - If on free tier, upgrade to Starter
2. **Try the test workflow first:**
   - Import `workflows/00-test-connection.json` before others
3. **Re-download the file:**
   - Delete the JSON file
   - Re-clone the repository
   - Try importing again
4. **For complex AI workflows:** Some workflows with LangChain/AI nodes may occasionally have import issues. Ask in Slack - instructors have alternative import methods.

---

#### "Node type not found" (red error on workflow nodes)

**What it means:** Your N8N instance doesn't have the required node installed.

**Fix:**
1. Note which node is showing the error
2. Go to N8N Settings (gear icon) → Community Nodes
3. Search for the missing node
4. Click Install
5. Refresh the workflow page
6. The error should disappear

**Common nodes to install:**
- AI/LLM nodes are built-in on Starter tier
- Google nodes are built-in
- Slack nodes are built-in

---

#### "Credential not found" / "Invalid credentials"

**What it means:** The workflow needs an API connection that isn't set up yet.

**Fix:**
1. In N8N, click the node showing the error
2. In the right panel, find "Credential"
3. Click "Create New"
4. Follow the prompts to add your API key or OAuth connection
5. Save and run workflow again

---

#### Workflow runs but nothing happens

**What it means:** The workflow executed but didn't produce visible output.

**Fixes:**
1. **Check if workflow is active:**
   - Look at the toggle at top-right of workflow
   - If it says "Inactive", the workflow won't run automatically
   - Click to activate (for webhook-triggered workflows)
2. **Check the right trigger type:**
   - For testing, click "Test workflow" (not "Execute")
   - Manual trigger workflows need to be executed manually
3. **Check each node output:**
   - Click each node
   - Look at "Input" and "Output" tabs on the right
   - Find where data stops flowing

---

### Claude Code Issues

#### Claude Code icon not visible in VS Code

**Fix:**
1. Open VS Code Extensions (Cmd/Ctrl + Shift + X)
2. Search "Claude Code"
3. If not installed, click Install
4. If installed, try:
   - Click the "Disable" button, then "Enable"
   - Restart VS Code
5. Look in left sidebar (might need to scroll)

---

#### "Extension not responding" / Claude Code unresponsive

**Fix (try in order):**
1. Click somewhere else in VS Code, then back to Claude Code panel
2. Close the Claude Code panel, reopen it
3. Restart VS Code completely:
   - Mac: Cmd + Q
   - Windows: File → Exit
   - Reopen VS Code
4. Check for VS Code updates: Help → Check for Updates
5. Check for extension updates: Extensions → Claude Code → Check for updates

---

#### "Sign in failed" / Can't authenticate

**Fixes:**
1. **Verify Claude Pro subscription:**
   - Go to claude.ai in browser
   - Check you can log in
   - Verify "Pro" appears on your account
2. **Try signing out and back in:**
   - In VS Code, open Command Palette (Cmd/Ctrl + Shift + P)
   - Type "Claude: Sign Out"
   - Then "Claude: Sign In"
3. **Check firewall/VPN:**
   - If using VPN, try disabling temporarily
   - If on corporate network, try from home network

---

#### "Rate limited" / "Too many requests"

**What it means:** You've sent too many requests in a short time.

**Fix:**
1. Wait 60 seconds
2. Try again with a simpler/shorter request
3. Break large tasks into smaller pieces
4. If persistent, check Claude status at status.anthropic.com

---

### Gemini API Issues

#### "400 Bad Request"

**What it means:** The request format is wrong, often due to API key issues.

**Fixes:**
1. **Check for extra spaces:**
   - When copying the API key, make sure no spaces at start or end
   - Delete the key and paste it fresh
2. **Verify key format:**
   - Should be ~40 characters
   - Should start with `AIza`
3. **Create a new key:**
   - Go to aistudio.google.com → Get API Key
   - Create new key
   - Try with new key

---

#### "401 Unauthorized" / "Invalid API key"

**What it means:** The API key is wrong or inactive.

**Fixes:**
1. **Get fresh key:**
   - Go to [aistudio.google.com](https://aistudio.google.com)
   - Click "Get API Key"
   - Create a new key
   - Use the new key
2. **Check you're using the right key:**
   - Google AI Studio key (starts with `AIza`)
   - NOT a Google Cloud API key

---

#### "403 Forbidden"

**What it means:** Your API key doesn't have permission, or terms not accepted.

**Fixes:**
1. **Accept terms of service:**
   - Go to aistudio.google.com
   - Make sure you've accepted all terms
2. **Verify key source:**
   - Key MUST be from aistudio.google.com
   - Google Cloud Platform keys may not work

---

#### "429 Rate limit exceeded" / "Quota exceeded"

**What it means:** You've used too many requests.

**Fixes:**
1. **Wait 60 seconds:** Rate limit resets
2. **Check your quota:**
   - Free tier: 15 requests/minute, 1500/day
   - This is plenty for testing
3. **If you need more:**
   - You can upgrade via Google Cloud Console
   - But free tier should be sufficient for this course

---

#### "curl: command not found"

**What it means:** The curl tool isn't installed.

**Fix - Mac:**
Curl should be pre-installed. If not:
```bash
brew install curl
```

**Fix - Windows:**
Use PowerShell instead (see command in Phase 6), or:
1. Download curl from [curl.se/download.html](https://curl.se/download.html)
2. Or install Git Bash which includes curl

**Fix - Linux:**
```bash
sudo apt install curl
```

---

### Slack Integration Issues

#### Bot not posting messages

**Fixes:**
1. **Invite bot to channel:**
   - In Slack, go to the channel
   - Type: `/invite @YourBotName`
   - Or: Channel settings → Integrations → Add app
2. **Check channel ID:**
   - Right-click channel name → "Copy link"
   - The ID is the last part of the URL (starts with C)
   - Make sure this matches what's in N8N

---

#### "missing_scope" error

**What it means:** The Slack app needs more permissions.

**Fix:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. Click "OAuth & Permissions"
4. Under "Bot Token Scopes", add:
   - `chat:write`
   - `channels:read`
5. Click "Reinstall to Workspace"
6. Update the token in N8N

---

#### "invalid_auth" / Token errors

**What it means:** The Slack token is wrong or expired.

**Fix:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. OAuth & Permissions → "Bot User OAuth Token"
4. Copy the token (starts with `xoxb-`)
5. Update in N8N Credentials

---

### OpenRouter / LLM API Issues

#### "Rate limit exceeded"

**For OpenRouter:** This shouldn't happen - OpenRouter has no rate limits for paid accounts.
- Check you have credit in your account
- Profile → Credits → Add credit if needed

**For Claude API / OpenAI API:** New accounts have tier limits.
- Solution: Switch to OpenRouter (no rate limits)
- Or wait and try again in a few minutes

---

#### "Invalid API key"

**Fixes:**
1. Double-check you copied the full key
2. No extra spaces at start or end
3. Key format:
   - OpenRouter: starts with `sk-or-`
   - Claude: starts with `sk-ant-`
   - OpenAI: starts with `sk-`
4. Try regenerating the key

---

#### "Insufficient credits"

**Fix:**
- OpenRouter: Profile → Credits → Add funds
- Claude: Console → Billing → Add credit
- OpenAI: Platform → Billing → Add funds

---

#### "Model not found"

**Fixes:**
1. Check model ID spelling exactly
2. OpenRouter format: `provider/model-name`
   - Example: `anthropic/claude-sonnet-4`
3. Direct API format: just the model name
   - Example: `claude-sonnet-4-20250514`

---

### Platform-Specific Issues

#### Mac-Specific

**"Operation not permitted" when running scripts:**
```bash
sudo chmod +x setup.sh
./setup.sh
```

**"Command Line Tools" popup appears:**
- Click "Install" and wait
- This installs necessary developer tools

**Terminal opens with zsh instead of bash:**
- Both work fine for this course
- Commands are compatible

---

#### Windows-Specific

**"not recognized as an internal or external command":**
- Make sure you're in the right directory
- Use `dir` to list files (not `ls`)
- Consider using Git Bash instead of Command Prompt

**Line ending issues (script shows `^M` characters):**
```bash
# In Git Bash:
sed -i 's/\r$//' setup.sh
./setup.sh
```

**PowerShell execution policy blocks scripts:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

#### Linux-Specific

**"sudo: command not found":**
- You're likely in a restricted environment
- Contact your system administrator

**"bash: setup.sh: Permission denied":**
```bash
chmod +x setup.sh
./setup.sh
```

**Missing dependencies:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install curl git

# Fedora
sudo dnf install curl git
```

---

## GLOSSARY

### General Terms

**API (Application Programming Interface):** A way for programs to talk to each other. When we use an "API key", it's like a password that lets your workflows access AI services.

**API Key:** A secret code (like a password) that identifies you when using services like Gemini or OpenRouter. Never share these publicly.

**Repository (Repo):** A folder containing code and files, hosted on GitHub. You "clone" it to download a copy to your computer.

**Clone:** Downloading a copy of a repository from GitHub to your computer.

**Terminal / Command Line:** A text-based interface to control your computer. You type commands instead of clicking buttons.

---

### N8N Terms

**Workflow:** A series of connected steps (nodes) that automate a task. Like a flowchart that actually runs.

**Node:** A single step in a workflow. Each node does one thing: get data, process it, send it somewhere, etc.

**Trigger:** The node that starts a workflow. Can be a schedule, webhook, email arrival, etc.

**Webhook:** A URL that, when called, triggers your workflow. Like a doorbell that starts an automation.

**Credential:** Saved login information (API keys, OAuth tokens) that N8N uses to connect to other services.

**Execute:** Run a workflow once to test it.

**Activate:** Turn on a workflow so it runs automatically when triggered.

---

### AI Terms

**LLM (Large Language Model):** AI systems like Claude or GPT that understand and generate text.

**Prompt:** The instructions you give to an AI. Better prompts = better results.

**RAG (Retrieval-Augmented Generation):** A technique where AI looks up information from documents before answering. This is how our knowledge base works.

**Token:** A unit of text (roughly 4 characters or ¾ of a word). AI pricing is usually per token.

**Context Window:** How much text an AI can "see" at once. Larger context = can handle longer conversations.

---

### OAuth Terms

**OAuth:** A secure way to give apps limited access to your accounts without sharing your password.

**OAuth Token:** A temporary credential generated through OAuth. Gets refreshed automatically.

**Scopes:** Permissions that define what an OAuth connection can do (e.g., read emails vs. send emails).

---

## ESCALATION PATH

### Try These Steps First (in order):

1. **Read the error message carefully** - it often tells you what's wrong
2. **Search this guide** (Ctrl/Cmd + F) for the error text
3. **Ask your AI assistant** - paste the error message and ask for help
4. **Restart the application** - fixes many temporary issues
5. **Re-do the step from scratch** - sometimes we miss small details

### When to Ask Humans for Help:

**Post in course Slack when:**
- You've tried the fixes in this guide and it still doesn't work
- The error message isn't listed here
- You're stuck for more than 15 minutes on the same issue
- Something seems broken (not just misconfigured)

**Include in your Slack message:**
1. **What step** you're on (e.g., "Phase 4, Step 4.2")
2. **Exact error message** - copy-paste the full text
3. **Screenshot** - especially helpful for visual issues
4. **What you've already tried** - so we don't suggest things you've done
5. **Your setup** - Mac/Windows/Linux, browser, VS Code version

### Urgent Issues:

**Tag Tyler directly when:**
- It's within 24 hours of a live session and you can't complete setup
- You suspect a bug in the course materials
- An account/billing issue is blocking your progress

### Office Hours:

Come to office hours (Dec 5 & 12) with your questions. Live troubleshooting is often faster than async debugging.

---

## THE NUCLEAR OPTION

If everything is broken and nothing in this guide helps:

**Complete fresh start:**

1. **Delete the repo folder:**

   Mac/Linux:
   ```bash
   cd ~
   rm -rf mindvalley-ai-mastery-students
   ```

   Windows:
   - Navigate to the folder in File Explorer
   - Delete the folder

2. **Re-clone from scratch:**
   ```bash
   git clone https://github.com/8Dvibes/mindvalley-ai-mastery-students.git
   cd mindvalley-ai-mastery-students
   ```

3. **Follow setup from Phase 1, Step 1.1**

This resolves most issues caused by corrupted files or partial downloads.

---

## QUICK REFERENCE TABLE

| Problem | Quick Fix |
|---------|-----------|
| git: command not found | Install Git from git-scm.com |
| Repository not found | Check URL spelling, verify access in browser |
| Permission denied (publickey) | Use HTTPS URL instead of SSH |
| Permission denied on setup.sh | Run `chmod +x setup.sh` first |
| Claude Code not responding | Restart VS Code |
| Claude Code not recognizing repo | Verify `.claude/` folder exists |
| N8N workflow import fails | Check Starter tier subscription |
| N8N node missing | Install community nodes in Settings |
| N8N "credential not found" | Create credential in N8N for that service |
| Gemini "400 Bad Request" | Re-copy API key, no spaces |
| Gemini "401 Unauthorized" | Create new key from aistudio.google.com |
| Gemini "403 Forbidden" | Accept terms at aistudio.google.com |
| Slack messages not appearing | Invite bot to channel with /invite |
| Rate limited | Wait 60 seconds, try again |
| Any mysterious issue | Restart the app, try again |

---

## VERSION INFO

- **Course:** MindValley AI Mastery
- **Launch Date:** December 3, 2025
- **Guide Version:** 1.0
- **Last Updated:** December 1, 2025
- **Repository:** github.com/8Dvibes/mindvalley-ai-mastery-students

---

*This guide is designed to be uploaded to Claude, ChatGPT, or any AI assistant to provide context for troubleshooting your MindValley AI Mastery setup.*
