# Byte Email

Email interface for Byte AI assistant. Send an email to Byte and get an intelligent response.

**Status:** PRODUCTION READY & DEPLOYED
**Live:** https://byte-email.onrender.com
**Email:** byte@chrisleebergstrom.com
**Repository:** https://github.com/Nxtvanhalen/byte-email

---

## How It Works

```
You send email -> byte@chrisleebergstrom.com
                        |
              Resend receives it (MX records)
                        |
              Webhook triggers this service
                        |
              Claude Haiku 4.5 generates response
                        |
              Byte replies to your email
```

---

## Tech Stack

- **Runtime:** Bun
- **Server:** Hono (zero-dependency, Bun-native)
- **AI Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Email:** Resend (inbound + outbound)
- **Database:** Upstash Redis
- **Logging:** Pino (structured JSON in production, pretty-printed in dev)
- **Hosting:** Render (native Bun runtime)
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks

---

## Features

### Conversation Threading
- Redis-based conversation storage
- Thread continuity across email replies
- 30-day conversation retention
- Clean subject lines (no accumulating "Re: Re: Re:")

### Rate Limiting & Spam Protection
- 15 emails/hour per sender
- 50 emails/day per sender
- Styled rate limit responses

### Dark Mode Email Design
- Pure black background (#000000)
- Dark purple accents (#9B7ED1)
- Soft white text (#E8E8E8) for readability
- Full-width 700px layout
- Email client compatible (table-based, inline styles)

### Error Handling & Resilience
- Retry logic with exponential backoff + jitter
- Graceful degradation for all failure points
- Styled error emails that maintain Byte's personality
- "Thinking" acknowledgment emails

---

## Extended Thinking Mode

Include **"THINK"** (all caps) anywhere in your email to activate deep reasoning:

```
To: byte@chrisleebergstrom.com
Subject: Debug help

THINK - why isn't this function returning the right value?

[your code here]
```

| Mode         | Trigger         | Behavior                  |
| ------------ | --------------- | ------------------------- |
| **Normal**   | (default)       | Fast response, ~1-3 sec   |
| **Thinking** | Include "THINK" | Deep reasoning, ~5-15 sec |

---

## Attachment Processing

| Type                             | Method                    | Status  |
| -------------------------------- | ------------------------- | ------- |
| **Images (PNG, JPG, GIF, WebP)** | Claude Vision API         | Working |
| **PDF**                          | Claude native document vision | Working |
| **Excel/CSV**                    | `xlsx` library -> text    | Working |

### PDF Native Vision
PDFs are sent directly to Claude as document content blocks. Claude visually processes each page, preserving tables, charts, diagrams, and layout. No local parsing library needed.

### Graceful Degradation
- If attachment processing fails, Byte still responds to the text
- User is notified which attachments couldn't be processed
- Partial success is better than total failure

---

## Error Handling System

### Error Types & User Messages

| Error Type          | Title                           | User Sees                              |
| ------------------- | ------------------------------- | -------------------------------------- |
| `api_error`         | "Hit a Technical Snag"          | AI brain having a moment, retry soon   |
| `rate_limit`        | "Whoa, Slow Down There"         | Sending too fast, wait a bit           |
| `attachment_failed` | "Couldn't Read Your Attachment" | File issue, try resending              |
| `thinking_timeout`  | "Deep Thought Taking Too Long"  | THINK mode taking longer than expected |
| `redis_down`        | "Memory Temporarily Offline"    | No conversation history available      |
| `send_failed`       | "Reply Got Stuck"               | Email sending failed, auto-retrying    |
| `unknown`           | "Something Went Wrong"          | Generic fallback                       |

### Retry Logic

**Claude API:**
- 3 attempts maximum
- Exponential backoff: 1s -> 2s -> 4s
- Retries on: rate limits, 5xx errors, timeouts, overloaded

**Resend Email:**
- 2 attempts maximum
- Exponential backoff: 1s -> 2s
- Retries on: network errors, server errors

### Graceful Degradation Matrix

| Failure Point          | Fallback Behavior                      |
| ---------------------- | -------------------------------------- |
| Redis unavailable      | Process without history, still respond |
| Attachment fails       | Respond to text, note failure in reply |
| Claude API fails       | Send styled error email after retries  |
| Send reply fails       | Send error notification email          |
| Rate limit check fails | Allow request (fail open)              |

---

## Architecture

```
Sender (any email)
       |
byte@chrisleebergstrom.com
       |
Resend Inbound (MX records, stores email)
       | webhook POST
       v
Render Service (byte-email, Bun + Hono)
       |
       |-> Verify signature (Svix)
       |-> Rate limit check (Redis)         <- graceful fail
       |-> Fetch email content (Resend API)
       |-> Detect THINK trigger
       |-> Send thinking ack (if THINK mode)
       |-> Process attachments               <- graceful fail
       |-> Load conversation history (Redis)
       |-> Generate response (Claude)        <- 3 retries
       |-> Save to Redis                     <- graceful fail
       |-> Send reply (Resend)               <- 2 retries
       v
Reply arrives in sender's inbox
(or error email if something broke)
```

---

## Project Structure

```
src/
├── index.ts                    # Hono server, routes, Bun.serve()
├── handlers/
│   └── email.ts               # Main webhook handler with error handling
├── services/
│   ├── claude.ts              # Claude API with retry logic
│   ├── redis.ts               # Upstash Redis client
│   ├── resend.ts              # Email sending with retries
│   └── attachments.ts         # Image/PDF/Excel processing
└── lib/
    ├── logger.ts              # Pino structured logging
    ├── email-template.ts      # Main HTML email template (dark mode)
    ├── error-templates.ts     # Styled error & acknowledgment emails
    └── retry.ts               # Exponential backoff utility
```

---

## Setup

### 1. Install Dependencies

```bash
bun install
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
bun run dev
```

### 4. Preview Email Template

Visit `http://localhost:3000/preview` to see the email template without sending.

### 5. Deploy to Render

Push to GitHub, then in Render:
- New -> Web Service -> Connect repo
- Runtime: **Bun**
- Build command: `bun install`
- Start command: `bun src/index.ts`
- Add environment variables
- Deploy

### 6. Configure Webhook

In Resend dashboard:
- Webhooks -> Add Webhook
- Endpoint: `https://byte-email.onrender.com/api/email/webhook`
- Events: `email.received`

---

## API Endpoints

| Endpoint                  | Method | Description                              |
| ------------------------- | ------ | ---------------------------------------- |
| `/`                       | GET    | Service info                             |
| `/health`                 | GET    | Health check                             |
| `/debug`                  | GET    | Environment check (dev only, blocked in prod) |
| `/preview`                | GET    | Preview email template in browser        |
| `/api/email/webhook`      | POST   | Resend webhook handler                   |
| `/api/email/test-webhook` | POST   | Debug endpoint (logs payload)            |

---

## Logging

Pino structured logging throughout the codebase:

- **Production:** JSON output for machine parsing and log aggregation
- **Development:** Pretty-printed with colors and timestamps via `pino-pretty`
- **Child loggers:** Request-scoped context (email ID, sender, subject) for tracing individual email journeys
- **Log levels:** debug, info, warn, error

---

## Design System

### Color Palette

| Element        | Color     | Usage                          |
| -------------- | --------- | ------------------------------ |
| Background     | `#000000` | Email body, outer wrapper      |
| Content area   | `#0a0a0a` | Main content background        |
| Header         | `#1e1a2e` | Dark purple header bar         |
| Primary text   | `#E8E8E8` | Body text, readable on dark    |
| Secondary text | `#888888` | Muted text, timestamps         |
| Accent         | `#9B7ED1` | Links, code, quote borders     |
| Bold text      | `#EBEBEB` | Slightly brighter for emphasis |

### Typography
- **Font:** Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Size:** 15px base
- **Line height:** 1.7

---

## License

MIT
