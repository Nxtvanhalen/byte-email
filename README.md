# Byte Email

Email interface for Byte AI assistant. Send an email to Byte and get an intelligent response.

## How It Works

```
You send email → byte@chrisleebergstrom.com
                        ↓
              Resend receives it
                        ↓
              Webhook triggers this service
                        ↓
              Claude generates response
                        ↓
              Byte replies to your email
```

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
- Endpoint: `https://your-app.onrender.com/api/email/webhook`
- Events: `email.received`

## Features

- **Conversational threading** - Replies maintain context
- **Rate limiting** - 15/hour, 50/day per sender
- **Graceful attachment handling** - Acknowledges but doesn't process (yet)
- **Redis persistence** - Conversations stored for 30 days
- **Cross-channel ready** - Chat/voice can access email threads

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/api/email/webhook` | POST | Resend webhook |

## License

MIT
