# Byte Email

Email interface for Byte AI assistant. Send an email to Byte and get an intelligent response. No app, no login, no website. Just email.

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
              Idempotency check (skip duplicates)
                        |
              Rate limit check (per-sender + global)
                        |
              Fetch email content (3 retries)
                        |
              Process attachments (2 retries each)
                        |
              Claude Haiku 4.5 generates response (3 retries, 30s timeout)
                        |
              Byte replies to your email (2 retries)
```

---

## Tech Stack

- **Runtime:** Bun (Anthropic-acquired, native TypeScript)
- **Server:** Hono (zero-dependency, Bun-native)
- **AI Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Email:** Resend (inbound webhooks + outbound sending)
- **Database:** Upstash Redis (conversations, rate limits, idempotency)
- **Logging:** Pino (structured JSON in production, pretty-printed in dev)
- **Hosting:** Render (native Bun runtime, paid tier)
- **Code Quality:** ESLint, Prettier, Husky pre-commit hooks

---

## Features

### Conversation Threading
- Redis-based conversation storage
- Thread continuity across email replies
- 30-day conversation retention
- Clean subject lines (no accumulating "Re: Re: Re:")

### Rate Limiting & Spam Protection
- 10 emails/hour per sender
- 25 emails/day per sender
- 500 emails/hour global (protects Claude API budget)
- In-memory fallback rate limiter when Redis is unavailable
- Detailed rate limit emails: tells user which limit was hit and when it resets

### Webhook Idempotency
- Redis-based deduplication with 24-hour TTL
- Prevents duplicate replies when Resend retries webhooks
- Fails open if Redis is down (processes anyway, risk of duplicate > dropping email)

### Input Guards
- Email body capped at 50K characters (truncated with notice)
- Max 5 attachments per email (excess listed by name, user invited to follow up)
- PDF size capped at 25MB (Claude's document limit)
- Total input tokens capped at 150K with intelligent truncation
- Claude API timeout: 30s normal, 45s thinking mode

### Self-Aware Assistant
- Byte knows how it works and can explain itself when asked
- Understands its own capabilities, limitations, and email-based interface
- Can guide new users: "just email me, attach files, use THINK for deep reasoning"

### Dark Mode Email Design
- Pure black background (#000000)
- Dark purple accents (#9B7ED1)
- Soft white text (#E8E8E8) for readability
- Full-width 700px layout
- Email client compatible (table-based, inline styles)

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

| Type                             | Method                        | Limit   |
| -------------------------------- | ----------------------------- | ------- |
| **Images (PNG, JPG, GIF, WebP)** | Claude Vision API (base64)    | 5/email |
| **PDF**                          | Claude native document vision | 25MB    |
| **Excel/CSV**                    | `xlsx` library -> text        | 5/email |

### PDF Native Vision
PDFs are sent directly to Claude as document content blocks. Claude visually processes each page, preserving tables, charts, diagrams, and layout. No local parsing library needed.

### Attachment Overflow
If more than 5 attachments are sent, Byte processes the first 5 and replies with the specific filenames it analyzed, which were skipped, and invites the user to send the rest in a follow-up email. Thread continuity means the follow-up already has context.

### Graceful Degradation
- If attachment processing fails, Byte still responds to the text
- User is notified which attachments couldn't be processed by filename
- Partial success is better than total failure

---

## Resilience System

### Retry Coverage (every external call)

| External Call       | Retries | Backoff            | Timeout |
| ------------------- | ------- | ------------------ | ------- |
| Fetch email content | 3       | 1s -> 2s -> 4s     | —       |
| Fetch attachment    | 2       | 1s -> 2s           | —       |
| Claude API          | 3       | 1s -> 2s -> 4s     | 30s (45s thinking) |
| Send reply (Resend) | 2       | 1s -> 2s           | —       |

All retries use exponential backoff with 0-30% jitter to prevent thundering herd.

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

### Graceful Degradation Matrix

| Failure Point          | Fallback Behavior                                    |
| ---------------------- | ---------------------------------------------------- |
| Redis unavailable      | In-memory rate limiting, process without history      |
| Rate limit check fails | In-memory sliding window enforces same limits         |
| Idempotency check fails| Process anyway (duplicate risk < dropped email risk)  |
| Attachment fails       | Respond to text, note failure by filename in reply    |
| Claude API hangs       | 30s abort, auto-retry up to 3 attempts               |
| Claude API fails       | Send styled error email after retries                 |
| Send reply fails       | Send error notification email                         |
| Email body too large   | Truncate at 100K chars with notice                    |
| Too many attachments   | Process first 5, list skipped files, invite follow-up |
| PDF too large          | Skip with size error, process other attachments       |

---

## Architecture

```
Sender (any email, any device)
       |
byte@chrisleebergstrom.com
       |
Resend Inbound (MX records, stores email)
       | webhook POST
       v
Render Service (byte-email, Bun + Hono)
       |
       |-> Verify signature (Svix)
       |-> Idempotency check (Redis SET NX)    <- fail open
       |-> Rate limit check (Redis + memory)   <- in-memory fallback
       |-> Fetch email content (Resend API)    <- 3 retries
       |-> Input size guard (100K chars)
       |-> Detect THINK trigger
       |-> Send thinking ack (if THINK mode)
       |-> Process attachments (max 5, 25MB)   <- 2 retries each
       |-> Load conversation history (Redis)   <- graceful fail
       |-> Generate response (Claude)          <- 3 retries, 30s timeout
       |-> Save to Redis                       <- graceful fail
       |-> Send reply (Resend)                 <- 2 retries
       v
Reply arrives in sender's inbox
(or styled error email if something broke)
```

---

## Project Structure

```
src/
├── index.ts                    # Hono server, routes, Bun.serve()
├── handlers/
│   └── email.ts               # Main webhook handler, idempotency, rate limiting
├── services/
│   ├── claude.ts              # Claude API with retry + timeout, Byte personality
│   ├── redis.ts               # Upstash Redis client
│   ├── resend.ts              # Email sending with retries
│   └── attachments.ts         # Image/PDF/Excel processing with retries
└── lib/
    ├── logger.ts              # Pino structured logging config
    ├── email-template.ts      # Main HTML email template (dark mode)
    ├── error-templates.ts     # Styled error & acknowledgment emails
    └── retry.ts               # Exponential backoff utility with jitter
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
- **Service tags:** Each module has its own child logger (`service: 'claude'`, `service: 'resend'`, etc.)

---

## Scaling

### Current Limits (code-enforced)

| Limit                  | Value    | Purpose                    |
| ---------------------- | -------- | -------------------------- |
| Per-sender hourly      | 10       | Spam protection            |
| Per-sender daily       | 25       | Spam protection            |
| Global hourly          | 500      | API budget protection      |
| Email body             | 50K chars | Token blowout prevention  |
| Attachments per email  | 5        | Processing cap             |
| PDF size               | 25MB     | Claude's document limit    |
| Input token budget     | 150K     | Context overflow prevention|
| Claude timeout         | 30s/45s  | Hang protection            |
| Claude max tokens      | 4,096    | Response length (normal)   |
| Claude max tokens      | 16,000   | Response length (thinking) |
| Thinking budget        | 10,000   | Reasoning token budget     |

### Token Budget Management

If total input tokens exceed 150K (leaving room for response in Claude's 200K context), the system automatically truncates in priority order:
1. **Conversation history** — oldest messages dropped first
2. **PDF attachments** — most expensive, dropped next
3. **Image attachments** — dropped next
4. **Email content** — truncated only as last resort

Users are notified what was truncated and invited to send content separately if needed.

### Service Tier Requirements

| Users/Day | Resend          | Upstash Redis     | Render         | Claude API     |
| --------- | --------------- | ----------------- | -------------- | -------------- |
| < 30      | Free (100/day)  | Free (10K cmd/day)| Free           | ~$1/month      |
| 100       | Free (borderline)| Free (borderline) | $7/month       | ~$5/month      |
| 1,000     | Pro ($20/month) | Pay-as-you ($2)   | $7/month       | ~$150-360/month|
| 10,000+   | Pro or SES      | Pro ($10/month)   | Auto-scale     | $1,500+/month  |

### Future Scaling Considerations

- **LLM Provider Flexibility:** Claude is called from a single file (`claude.ts`). Switching to OpenAI, Gemini, or Grok is a 1-file change for text. Full attachment parity (especially native PDF) varies by provider.
- **Email Provider:** Resend handles both inbound and outbound. At 10K+ users/day, self-hosted SMTP inbound + Amazon SES outbound ($0.10/1000) would reduce costs significantly.
- **Render Auto-scaling:** Available on Pro plan ($25/month per instance). Not needed until sustained high concurrency.
- **Uptime Monitoring:** Recommended: UptimeRobot (free) pinging `/health` every 5 minutes with email alerts.

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
