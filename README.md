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

## Session Progress - January 25-26, 2026

### What We Built

1. **Complete Email Gateway**
   - Resend inbound email integration
   - Webhook signature verification (Svix)
   - Claude Haiku 4.5 for fast, cost-effective responses

2. **Conversation Threading**
   - Redis-based conversation storage
   - Thread continuity across email replies
   - 30-day conversation retention
   - Clean subject lines (no accumulating "Re: Re: Re:")

3. **Rate Limiting & Spam Protection**
   - 15 emails/hour per sender
   - 50 emails/day per sender
   - Styled rate limit responses

4. **Dark Mode Email Design**
   - Pure black background (#000000)
   - Dark purple accents (#9B7ED1)
   - Soft white text (#E8E8E8) for readability
   - Segoe UI font, 15px
   - Rounded header corners
   - Full-width 700px layout

5. **Error Handling & Resilience**
   - Retry logic with exponential backoff
   - Graceful degradation for all failure points
   - Styled error emails that maintain Byte's personality
   - "Thinking" acknowledgment emails

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

### Email Client Compatibility

The template uses:

- `bgcolor` HTML attributes (required for Apple Mail)
- `color-scheme: dark` meta tags
- Inline styles (no external CSS)
- Table-based layout for maximum compatibility

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

When thinking mode is triggered:

1. Byte immediately sends a "thinking" acknowledgment email
2. Extended reasoning runs with 10k token budget
3. Final response includes: _"I took my time on this one, as you asked."_

---

## Attachment Processing

| Type                             | Library           | Status     |
| -------------------------------- | ----------------- | ---------- |
| **Images (PNG, JPG, GIF, WebP)** | Claude Vision API | ✅ Working |
| **PDF**                          | `pdf-parse` v2    | ✅ Working |
| **Excel/CSV**                    | `xlsx`            | ✅ Working |

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
- Exponential backoff: 1s → 2s → 4s
- Retries on: rate limits, 5xx errors, timeouts, overloaded

**Resend Email:**

- 2 attempts maximum
- Exponential backoff: 1s → 2s
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
│            ├──► Rate limit check (Redis) ◄── graceful fail     │
│            ├──► Fetch email content (Resend API)               │
│            ├──► Detect THINK trigger                           │
│            ├──► Send thinking ack (if THINK mode)              │
│            ├──► Process attachments ◄── graceful fail          │
│            ├──► Load conversation history (Redis)              │
│            ├──► Generate response (Claude) ◄── 3 retries       │
│            ├──► Save to Redis ◄── graceful fail                │
│            └──► Send reply (Resend) ◄── 2 retries              │
│                        │                                        │
│                        ▼                                        │
│              Reply arrives in sender's inbox                    │
│              (or error email if something broke)                │
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

## Project Structure

```
src/
├── index.ts                    # Express server, routes, preview endpoint
├── handlers/
│   └── email.ts               # Main webhook handler with error handling
├── services/
│   ├── claude.ts              # Claude API with retry logic
│   ├── redis.ts               # Upstash Redis client
│   ├── resend.ts              # Email sending with retries
│   └── attachments.ts         # PDF/image/Excel processing
└── lib/
    ├── email-template.ts      # Main HTML email template (dark mode)
    ├── error-templates.ts     # Styled error & acknowledgment emails
    └── retry.ts               # Exponential backoff utility
```

---

## Key Files Explained

### `src/handlers/email.ts`

Main webhook handler. Orchestrates the entire email processing flow:

- Webhook verification
- Rate limiting with graceful degradation
- THINK mode detection and acknowledgment
- Attachment processing with partial failure handling
- Conversation threading
- Response generation with retries
- Error notification on failures

### `src/lib/email-template.ts`

Dark mode HTML email template:

- Pure black background
- Purple accents
- Markdown-to-HTML conversion (headers, lists, code blocks)
- Quoted original message section
- Email client compatibility (bgcolor attributes)

### `src/lib/error-templates.ts`

On-brand error emails:

- `formatErrorEmailHtml()` - Styled error messages
- `formatThinkingAckHtml()` - "Byte is thinking" acknowledgment
- Maintains Byte's personality in error states

### `src/lib/retry.ts`

Reusable retry utility:

- Exponential backoff with jitter
- Configurable attempts and delays
- Smart error classification (retryable vs fatal)

### `src/services/claude.ts`

Claude API integration:

- Byte's email personality prompt
- THINK mode with extended thinking
- Image support via Vision API
- 3 retries on API failures

### `src/services/resend.ts`

Email sending:

- `sendByteReply()` - Main reply with retries
- `sendErrorEmail()` - Error notifications (no retry, fail silently)
- `sendThinkingAck()` - THINK mode acknowledgment

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

### 4. Preview Email Template

Visit `http://localhost:3000/preview` to see the email template without sending.

### 5. Deploy to Render

Push to GitHub, then in Render:

- New → Web Service → Connect repo
- Render will auto-detect `render.yaml`
- Add environment variables
- Deploy

### 6. Configure Webhook

In Resend dashboard:

- Webhooks → Add Webhook
- Endpoint: `https://byte-email.onrender.com/api/email/webhook`
- Events: `email.received`

---

## API Endpoints

| Endpoint                  | Method | Description                       |
| ------------------------- | ------ | --------------------------------- |
| `/`                       | GET    | Service info                      |
| `/health`                 | GET    | Health check                      |
| `/debug`                  | GET    | Environment variable check        |
| `/preview`                | GET    | Preview email template in browser |
| `/api/email/webhook`      | POST   | Resend webhook handler            |
| `/api/email/test-webhook` | POST   | Debug endpoint (logs payload)     |

---

## Development Notes

### Email Template Testing

1. Make changes to `src/lib/email-template.ts`
2. Build: `npm run build`
3. Open `/preview` in browser
4. Refresh to see changes

### Adding New Error Types

1. Add type to `ErrorType` union in `error-templates.ts`
2. Add message to `ERROR_MESSAGES` object
3. Use in handler: `formatErrorEmailHtml({ type: 'your_new_type' })`

### Adjusting Retry Behavior

Edit constants in respective service files:

- `CLAUDE_RETRY_OPTIONS` in `claude.ts`
- `RESEND_RETRY_OPTIONS` in `resend.ts`

Or use `createRetrier()` from `retry.ts` for custom retry wrappers.

---

## Troubleshooting

### Webhook not receiving emails

- Check Resend dashboard for webhook delivery logs
- Verify URL is `https://byte-email.onrender.com/api/email/webhook`
- Check Render logs for incoming requests

### Dark mode not showing in Apple Mail

- Ensure `bgcolor` attributes are present (not just CSS)
- Check for `color-scheme: dark` meta tags
- Some clients override styles in reply composition

### Claude API errors

- Check Anthropic dashboard for API status
- Verify `ANTHROPIC_API_KEY` is set
- Check logs for specific error messages (rate limit, overloaded, etc.)

### Redis connection issues

- Verify `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN`
- System will continue without history (graceful degradation)
- Check Upstash dashboard for connection limits

---

## License

MIT
