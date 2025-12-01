# Hattie B's Hot Chicken Email Response System

**A complete multi-agent customer service automation demo for AI Mastery students**

## Overview

This demo showcases a production-grade email response system for Hattie B's Hot Chicken, featuring:

- **4 specialized AI agents** working in orchestrated workflow
- **Gemini File Search** for knowledge base retrieval (RAG)
- **Sentiment analysis** for intelligent routing
- **Quality assurance** before responses ship
- **Human-in-the-loop** (HITL) for edge cases via Slack
- **Real-world complexity** mirroring actual customer service needs

**What Students Learn**:
- Multi-agent orchestration patterns
- RAG implementation with Gemini File Search
- Prompt engineering for specialized roles
- Quality control and HITL design
- Production workflow considerations

**Time to Complete**: 45-60 minutes (including testing)

---

## Prerequisites

### Required Accounts & Access

1. **N8N Cloud** (AI Workflow Builder plan)
   - Advanced AI node access required
   - [Sign up here](https://n8n.io/cloud/) - Use educational pricing if available

2. **Claude API Key** (via Anthropic Console)
   - Configure in N8N as AI credential
   - [Get API key](https://console.anthropic.com/)

3. **Google AI Studio** (for Gemini File Search)
   - Free tier sufficient for demo
   - [Access here](https://aistudio.google.com/)

4. **Slack Workspace** (for HITL notifications)
   - Free tier works fine
   - Create dedicated #customer-service-hitl channel

5. **Email Account** (for testing)
   - Gmail recommended
   - Or use N8N's webhook email trigger

### Technical Prerequisites

- Basic familiarity with N8N interface
- Understanding of API credentials configuration
- Ability to import JSON workflows

---

## Quick Start

### Step 1: Import Workflows (Order Matters!)

Import these workflows in sequence from the `workflows/` folder:

1. **First**: `main-agent-chain-hattieb.json`
   - The orchestrator workflow
   - Coordinates all agents (CinnaMon → Hatch → YGM → QA)

2. **Then**: `hitl-slack-hattieb.json`
   - Human-in-the-loop Slack notifications
   - Handles escalations from QA agent

**How to Import**:
- N8N Dashboard → "Add Workflow" → "Import from File"
- Select JSON file
- Click through any credential warnings (we'll fix next)

### Step 2: Configure Credentials

#### A. Claude API (Anthropic)
1. N8N → Settings → Credentials → "Add Credential"
2. Choose "Anthropic API"
3. Paste your Claude API key
4. Name it: `Claude - AI Mastery`

#### B. Gemini API (Google)
1. Google AI Studio → Get API Key
2. N8N → Credentials → "Add Credential"
3. Choose "Google AI" or "Google Generative AI"
4. Paste Gemini API key
5. Name it: `Gemini - File Search`

#### C. Slack
1. Create Slack App or use webhook
2. N8N → Credentials → Configure Slack credential
3. Authorize workspace access
4. Test by sending message to #customer-service-hitl

#### D. Email (Trigger)
- **Option A**: Use N8N Email Trigger node (requires email forwarding setup)
- **Option B**: Use Webhook Trigger for testing (easier for demo)
- **Option C**: Connect Gmail via OAuth

### Step 3: Upload Knowledge Base to Gemini File Search

1. Navigate to `kb-content/` folder in this demo
2. Go to Google AI Studio → [Create File Search Tool]
3. Upload all KB files:
   - Menu & heat levels
   - Location & hours
   - FAQ
   - Allergen info
   - Policies
4. Copy the **Corpus ID** (you'll need this)
5. In N8N workflow, update Gemini File Search node with Corpus ID

**Files to Upload** (check `kb-content/` for actual files):
- `hattieb-menu-heat-levels.md`
- `hattieb-locations-hours.md`
- `hattieb-faq.md`
- `hattieb-allergen-info.md` (if available)
- `hattieb-policies.md` (if available)

### Step 4: Test With Sample Email

1. Open `test-emails/sample-emails.md`
2. Copy **Email #1** (Heat Level Question - easy positive test)
3. Trigger your workflow:
   - **Via Webhook**: POST the email content
   - **Via Email**: Send to configured address
   - **Manual Test**: Use "Execute Workflow" with manual input
4. Watch the execution log - you should see:
   - Email received
   - CinnaMon analyzes sentiment → "Positive/Neutral"
   - Hatch retrieves heat level info from Gemini
   - YGM drafts response
   - QA evaluates → "PASS - Ship it"
   - (If PASS) Response sent
   - (If FAIL) Slack notification to HITL channel

**Success = Email response sent OR Slack notification received**

### Step 5: Run Full Test Suite

Work through all 10 test emails in `test-emails/sample-emails.md`:
- Monitor each agent's performance
- Verify QA catches safety-critical issues (Email #3)
- Confirm negative sentiment escalates properly (Emails #4, #5)
- Check handoffs work for edge cases (Emails #6, #9, #10)

---

## File Structure

```
hattieb-complete/
├── README.md                          ← You are here
├── workflows/
│   ├── main-agent-chain-hattieb.json      ← Import first (main workflow)
│   └── hitl-slack-hattieb.json            ← Import second (HITL notifications)
├── prompts/
│   ├── ygm-hattieb.md                 ← YGM agent system prompt
│   ├── qa-hattieb.md                  ← QA agent system prompt (v1)
│   └── qa-hattieb-v2.md               ← QA agent enhanced prompt
├── kb-content/
│   └── [Knowledge base files]         ← Upload to Gemini File Search
└── test-emails/
    └── sample-emails.md               ← Test scenarios for validation
```

---

## Agent Overview

### The Multi-Agent Team

#### 1. CinnaMon (Sentiment Analysis)
**Role**: First-line triage based on emotional tone

**Input**: Raw customer email
**Output**: Sentiment classification (Positive, Neutral, Negative) + routing decision

**Why It Matters**: Negative sentiment gets priority routing and special handling. Positive feedback might trigger social sharing. Neutral goes through standard flow.

**Tech**: Claude Haiku (fast, cheap, good at classification)

---

#### 2. Hatch (Context Retrieval)
**Role**: Knowledge base search using RAG

**Input**: Customer question + sentiment context
**Output**: Relevant information from Hattie B's knowledge base

**Why It Matters**: Ensures responses are factually accurate and grounded in real company information. Prevents hallucination.

**Tech**: Gemini File Search API (managed RAG solution)

**Key Design Choice**: We use Gemini's managed service instead of building custom RAG to reduce complexity for students. Production systems might use Pinecone, Weaviate, or custom vector stores.

---

#### 3. YGM (Draft Generation - "You Got Mail")
**Role**: Drafts customer-facing email response

**Input**:
- Original customer email
- Sentiment classification from CinnaMon
- Context from Hatch (KB retrieval)

**Output**: Complete email draft matching Hattie B's brand voice

**Why It Matters**: This is where the magic happens. YGM synthesizes all inputs into a coherent, on-brand, helpful response.

**Tech**: Claude Sonnet (balanced quality/cost for generation)

**Prompt Engineering**: See `prompts/ygm-hattieb.md` for full system prompt. Key elements:
- Brand voice guidelines (Southern hospitality, warm but not hokey)
- Heat level positioning (proud of spice, but helpful)
- Tone matching (mirror customer energy)
- Structure templates

---

#### 4. QA (Quality Assurance - "Ship, Revise, or Escalate")
**Role**: Evaluates draft before it reaches customer

**Input**:
- YGM's draft response
- Original customer email
- Hatch's retrieved context

**Output**: Decision (SHIP / REVISE / ESCALATE) + reasoning

**Why It Matters**: Last line of defense against hallucinations, tone problems, or responses that need human judgment.

**Tech**: Claude Sonnet (needs reasoning capability)

**Evaluation Criteria** (see `prompts/qa-hattieb-v2.md`):
- **Factual accuracy**: No made-up info
- **Completeness**: All questions answered
- **Tone appropriateness**: Matches customer sentiment
- **Safety**: Flags allergen, legal, or high-stakes topics
- **Escalation triggers**: Complaints, refunds, PR inquiries, franchising

**Ship vs. Revise vs. Escalate**:
- **SHIP**: Response is good, send it
- **REVISE**: Response has issues but YGM can fix with feedback (loops back)
- **ESCALATE**: Needs human judgment (HITL via Slack)

---

## Testing Checklist

### You Know It's Working When...

#### Phase 1: Basic Flow
- [ ] Email trigger fires workflow
- [ ] CinnaMon node executes and outputs sentiment
- [ ] Hatch node queries Gemini File Search successfully
- [ ] YGM node generates response draft
- [ ] QA node evaluates draft
- [ ] Workflow completes without errors

#### Phase 2: Happy Path (Test Email #1 - Heat Level Question)
- [ ] CinnaMon detects positive/neutral sentiment
- [ ] Hatch retrieves heat level guide from KB
- [ ] YGM draft mentions specific heat levels with explanations
- [ ] QA passes the response (SHIP decision)
- [ ] Email sent to customer (or logged)

#### Phase 3: Quality Control (Test Email #3 - Allergen Question)
- [ ] CinnaMon correctly identifies tone
- [ ] Hatch retrieves allergen info if available
- [ ] YGM drafts cautious response
- [ ] **QA FAILS or ESCALATES** (safety-critical)
- [ ] Slack notification sent to #customer-service-hitl
- [ ] Notification includes email details + QA reasoning

#### Phase 4: Negative Sentiment (Test Email #4 - Wait Time Complaint)
- [ ] CinnaMon flags as NEGATIVE
- [ ] Workflow adjusts priority or routing
- [ ] YGM response is empathetic, non-defensive
- [ ] QA evaluates tone appropriateness
- [ ] Manager notification sent (even if QA passes response)

#### Phase 5: Edge Cases (Test Emails #6, #9, #10)
- [ ] Catering inquiry → Escalated to catering team
- [ ] Franchising inquiry → Escalated to corporate
- [ ] Influencer request → Escalated to marketing/PR
- [ ] QA correctly identifies out-of-scope scenarios
- [ ] Responses are polite but non-committal

#### Phase 6: Complex Multi-Question (Test Email #8)
- [ ] Hatch retrieves info for multiple topics
- [ ] YGM addresses all 5 questions
- [ ] QA verifies completeness
- [ ] Response is structured and easy to read

---

## Troubleshooting

### Issue: "Credential not found" errors
**Fix**:
1. Go to each AI node in workflow
2. Click credential dropdown
3. Select your configured credential
4. Save workflow

### Issue: Gemini File Search returns empty results
**Fix**:
1. Verify Corpus ID is correct in Hatch node
2. Check that files were uploaded successfully in Google AI Studio
3. Test query directly in AI Studio to confirm corpus works
4. Ensure API key has File Search API enabled

### Issue: Workflow triggers but agents don't execute
**Fix**:
1. Check execution log for specific error messages
2. Verify API keys are valid (test in separate workflow)
3. Ensure nodes are connected properly
4. Check if conditional routing logic is blocking execution

### Issue: QA always fails everything (too strict)
**Fix**:
1. Review QA prompt in `prompts/qa-hattieb-v2.md`
2. Adjust evaluation criteria if needed for demo
3. Add explicit examples of "good enough to ship" responses
4. Check if you're using v1 or v2 QA prompt (v2 is more balanced)

### Issue: YGM hallucinates menu items or policies
**Fix**:
1. Strengthen Hatch context retrieval (more specific queries)
2. Update YGM prompt to emphasize "ONLY use provided context"
3. Add examples of refusing to answer when KB has no info
4. Improve QA prompt to catch factual errors

### Issue: Slack notifications not sending
**Fix**:
1. Test Slack credential separately
2. Verify channel name is correct (including # symbol)
3. Check Slack app has permission to post in channel
4. Look for error messages in N8N execution log

### Issue: Responses are too formal / too casual
**Fix**:
1. Adjust YGM brand voice section in prompt
2. Add more tone examples for reference
3. Test with different customer email styles
4. Consider separate prompts for B2B vs. B2C inquiries

---

## Customization

### Adapting This System for Other Businesses

This architecture works for any customer service scenario. To adapt:

#### 1. Replace Knowledge Base
- Upload your business's docs to Gemini File Search
- Include: FAQ, policies, product info, locations, hours
- Format: Markdown or plain text works best
- Organize by topic for better retrieval

#### 2. Update Agent Prompts

**CinnaMon** (usually needs minimal changes):
- Adjust sentiment categories if needed (e.g., add "Urgent")
- Modify routing rules for your business priorities

**Hatch** (context retrieval):
- Update query formulation for your domain
- Adjust number of results returned
- Tune relevance thresholds

**YGM** (requires most customization):
- Rewrite brand voice guidelines
- Add industry-specific examples
- Update tone for your audience (B2B vs. B2C)
- Include product/service-specific guidance

**QA** (safety criteria change by industry):
- Define your "escalation triggers" (legal, medical, financial advice, etc.)
- Set quality bar for your brand
- Adjust ship/revise/escalate thresholds

#### 3. Modify Workflow Routing

**Add nodes for**:
- Multi-language detection → Route to specialized agents
- VIP customer detection → Priority handling
- Time-based routing (business hours vs. after-hours)
- Department-specific queues (sales, support, billing)

**Remove nodes if**:
- You don't need sentiment analysis (pure factual support)
- You have perfect KB coverage (no escalation needed - risky!)
- You're doing internal tools (different tone requirements)

#### 4. Integration Points

**This demo uses**:
- Email trigger → Webhook or Gmail
- Email send → SendGrid, Resend, or native N8N
- HITL → Slack

**You might swap**:
- Zendesk API (tickets instead of email)
- Intercom (chat instead of email)
- Teams or Discord (HITL channel)
- Airtable or Notion (logging and analytics)
- Twilio (SMS support)

---

## Advanced Explorations

Once you have the basic system working, try:

### 1. Add Analytics Layer
- Log all interactions to Airtable/Google Sheets
- Track: sentiment distribution, QA pass rate, escalation reasons
- Build dashboard showing system performance

### 2. Implement Learning Loop
- Collect human edits when HITL overrides QA
- Use edits as few-shot examples in prompts
- Measure if QA accuracy improves over time

### 3. Multi-Language Support
- Detect customer language
- Route to language-specific YGM agents
- Translate KB content or use multilingual embeddings

### 4. A/B Test Agent Prompts
- Run two versions of YGM with different prompts
- Randomly assign customers to version A or B
- Compare QA pass rates and customer satisfaction

### 5. Add Proactive Context
- Pull customer history from CRM before drafting
- Reference previous interactions
- Personalize based on order history or preferences

### 6. Build Self-Healing System
- When QA requests revision, log the issue type
- If YGM repeatedly fails on same issue, auto-update prompt
- Create feedback loop for continuous improvement

---

## Production Considerations

### This Demo vs. Production System

**This demo simplifies**:
- No customer database integration
- No order lookup system
- No authentication or security
- Basic error handling
- Single-threaded processing

**Production would add**:
- Rate limiting and queue management
- Customer identity verification
- PII handling and data retention policies
- Comprehensive logging and monitoring
- Failover and redundancy
- Performance optimization (caching, parallel processing)
- Version control for prompts and workflows
- Rollback capability for bad deployments
- Cost tracking per email processed

**Cost Analysis** (approximate):
- CinnaMon (Haiku): ~$0.001 per email
- Hatch (Gemini File Search): ~$0.002 per email
- YGM (Sonnet): ~$0.015 per email (varies by response length)
- QA (Sonnet): ~$0.010 per email
- **Total: ~$0.03 per email** (vs. $2-5 for human agent)

**Quality Expectations**:
- Target: 80%+ emails handled autonomously
- 15-20% escalated to human review
- <5% customer complaints about AI response
- 95%+ factual accuracy on KB questions

---

## Student Project Ideas

Use this system as a foundation for:

1. **Different Industry**: Adapt for hotel, restaurant, retail, SaaS support
2. **Multi-Channel**: Add SMS, chat, social media monitoring
3. **Proactive Support**: Monitor for shipping delays, outages, trigger preemptive emails
4. **Sales Assistant**: Qualify leads, schedule demos, provide pricing info
5. **Internal Tools**: HR helpdesk, IT support, onboarding automation
6. **Content Moderation**: Review user-generated content before publishing
7. **Feedback Analysis**: Aggregate customer sentiment, extract feature requests

---

## Resources

### Documentation
- [N8N AI Workflows](https://docs.n8n.io/ai/)
- [Gemini File Search API](https://ai.google.dev/docs/file_search)
- [Claude API Docs](https://docs.anthropic.com/)
- [RAG Architecture Patterns](https://www.anthropic.com/research/rag)

### Community
- N8N Discord (workflow help)
- AI Mastery Slack (student community)

### Related Course Content
- **Week 2**: Single Agent Fundamentals → YGM agent design
- **Week 3**: Knowledge Base Systems → Hatch + RAG implementation
- **Week 4**: This demo → Multi-agent orchestration

---

## Credits

**Demo Design**: Tyler Fisk (LightMagic AI)
**Fictional Business**: Hattie B's Hot Chicken (Nashville, TN - real restaurant, fictional automation)
**Course**: MindValley AI Mastery - Build Lab Track

**Prompt Engineering**: All agent prompts use principles from:
- Anthropic's Claude prompt engineering guide
- Chain of Density summarization methodology
- Constitutional AI for safety constraints

---

## License

This demo is for educational use in AI Mastery curriculum.
Students may adapt for personal projects. Commercial use requires permission.

---

## Questions or Issues?

1. Check `test-emails/sample-emails.md` for expected behavior
2. Review Troubleshooting section above
3. Post in #build-lab Slack channel with:
   - Which test email you're using
   - Screenshot of error or unexpected behavior
   - N8N execution log
4. Tag @Tyler for prompt engineering questions
5. Tag @[TA name] for N8N technical issues

---

**Ready to build? Start with Quick Start → Step 1!**
