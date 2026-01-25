# Byte Email

Email interface for Byte AI assistant. Send an email to Byte and get an intelligent response.

**Status:** ✅ PRODUCTION READY & DEPLOYED
**Live:** https://byte-email.onrender.com
**Email:** byte@chrisleebergstrom.com
**Repository:** https://github.com/Nxtvanhalen/byte-email

---

## How It Works

```
You send email → byte@chrisleebergstrom.com
                        ↓
              Resend receives it (MX records)
                        ↓
              Webhook triggers this service
                        ↓
              Claude Haiku 4.5 generates response
                        ↓
              Byte replies to your email
```

---

## Session Progress - January 25, 2026

### What We Built Today

1. **Complete Email Gateway**
   - Resend inbound email integration
   - Webhook signature verification (Svix)
   - Claude Haiku 4.5 for fast, cost-effective responses

2. **Conversation Threading**
   - Redis-based conversation storage
   - Thread continuity across email replies
   - 30-day conversation retention

3. **Rate Limiting & Spam Protection**
   - 15 emails/hour per sender
   - 50 emails/day per sender
   - Graceful rate limit responses

4. **Styled HTML Emails**
   - Byte branding with gradient header
   - Markdown rendering in responses
   - Mobile-friendly email template

### Issues Fixed

| Issue | Solution |
|-------|----------|
| Webhook returning 404 | URL was missing `/api/email/webhook` path |
| Resend API 404 on email fetch | Changed endpoint from `/emails/{id}` to `/emails/receiving/{id}` for inbound emails |
| Raw body parsing | Changed `express.raw({ type: 'application/json' })` to `type: '*/*'` |
| Webhook signature verification | Added proper Svix verification with raw body |

### Current Status

- ✅ Webhook receiving emails
- ✅ Signature verification working
- ✅ Email content fetching working
- ✅ Claude generating responses
- ✅ Reply emails sending
- ✅ Conversation threading in Redis
- ✅ Rate limiting active

---

## Next Steps

### Attachment Processing (Planned)

| Type | Library | Status |
|------|---------|--------|
| **Images (PNG, JPG)** | Claude Vision API | 🔜 Planned |
| **PDF** | `pdf-parse` | 🔜 Planned |
| **Excel** | `xlsx` | 🔜 Planned |

Currently attachments are detected and acknowledged but not processed. Next update will add:
- Image analysis via Claude's native vision capability
- PDF text extraction
- Excel/spreadsheet data extraction

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BYTE EMAIL SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Sender (any email)                                            │
│          │                                                      │
│          ▼                                                      │
│   byte@chrisleebergstrom.com                                    │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────────┐                                          │
│   │ Resend Inbound  │  MX records → Resend                     │
│   │ (stores email)  │                                          │
│   └────────┬────────┘                                          │
│            │ webhook POST                                       │
│            ▼                                                    │
│   ┌─────────────────┐                                          │
│   │ Render Service  │  /api/email/webhook                      │
│   │ (byte-email)    │                                          │
│   └────────┬────────┘                                          │
│            │                                                    │
│            ├──► Verify signature (Svix)                        │
│            ├──► Rate limit check (Redis)                       │
│            ├──► Fetch email content (Resend API)               │
│            ├──► Load conversation history (Redis)              │
│            ├──► Generate response (Claude Haiku 4.5)           │
│            ├──► Save to Redis                                  │
│            └──► Send reply (Resend)                            │
│                        │                                        │
│                        ▼                                        │
│              Reply arrives in sender's inbox                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **AI Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Email:** Resend (inbound + outbound)
- **Database:** Upstash Redis
- **Hosting:** Render

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```bash
RESEND_API_KEY=re_xxxxx          # From Resend dashboard
RESEND_WEBHOOK_SECRET=whsec_xxx  # From Resend webhooks
ANTHROPIC_API_KEY=sk-ant-xxx     # From Anthropic
UPSTASH_REDIS_URL=https://xxx    # From Upstash
UPSTASH_REDIS_TOKEN=xxx          # From Upstash
```

### 3. Run Locally

```bash
npm run dev
```

### 4. Deploy to Render

Push to GitHub, then in Render:
- New → Web Service → Connect repo
- Render will auto-detect `render.yaml`
- Add environment variables
- Deploy

### 5. Configure Webhook

In Resend dashboard:
- Webhooks → Add Webhook
- Endpoint: `https://byte-email.onrender.com/api/email/webhook`
- Events: `email.received`

---

## Features

- **Conversational threading** - Replies maintain full context
- **Rate limiting** - 15/hour, 50/day per sender (spam protection)
- **Attachment detection** - Acknowledges attachments (processing coming soon)
- **Redis persistence** - Conversations stored for 30 days
- **Cross-channel ready** - Chat/voice can access email threads via Redis
- **Styled responses** - Branded HTML emails with markdown support

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/debug` | GET | Environment variable check |
| `/api/email/webhook` | POST | Resend webhook handler |

---

## Key Files

```
src/
├── index.ts                 # Express server, routes
├── handlers/
│   └── email.ts            # Main webhook handler
├── services/
│   ├── claude.ts           # Claude API integration
│   ├── redis.ts            # Upstash Redis client
│   └── resend.ts           # Resend email sending
└── lib/
    └── email-template.ts   # HTML email formatting
```

---

## License

MIT
