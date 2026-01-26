import express from 'express'
import { handleEmailWebhook } from './handlers/email'
import { formatByteEmailHtml } from './lib/email-template'

const app = express()
const PORT = process.env.PORT || 3000

// Raw body needed for webhook signature verification - accept any content type
app.use('/api/email/webhook', express.raw({ type: '*/*' }))
app.use('/api/email/test-webhook', express.raw({ type: '*/*' }))
app.use(express.json())

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Byte Email',
    status: 'operational',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Debug endpoint - check env vars are set
app.get('/debug', (req, res) => {
  res.json({
    env: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? '✓ set' : '✗ missing',
      RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET ? '✓ set' : '✗ missing',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ missing',
      UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL ? '✓ set' : '✗ missing',
      UPSTASH_REDIS_TOKEN: process.env.UPSTASH_REDIS_TOKEN ? '✓ set' : '✗ missing',
    },
    timestamp: new Date().toISOString(),
  })
})

// Preview endpoint - see email template in browser
app.get('/preview', (req, res) => {
  // const { formatByteEmailHtml } = require('./lib/email-template')

  const sampleResponse = `Hey Chris,

Great question! Here's a breakdown of what you asked about:

## Key Points

- **First thing**: This is important because it sets the foundation
- **Second thing**: This builds on the first point
- **Third thing**: And this ties it all together

Here's some code you might find useful:

\`\`\`javascript
function example() {
  return "Hello from Byte!";
}
\`\`\`

The short answer is: it depends on your use case. But if I had to pick, I'd go with option B for most scenarios.

Let me know if you want me to dive deeper into any of these points.

I took my time on this one, as you asked.

— Byte`

  const sampleOriginal = `THINK - Can you explain how the email system works and give me some code examples? I want to understand the architecture.

Thanks!
Chris`

  const html = formatByteEmailHtml(sampleResponse, {
    originalMessage: sampleOriginal,
    originalFrom: 'chris@example.com',
    originalSubject: 'Question about architecture',
    originalDate: new Date(),
  })

  res.send(html)
})

// Email webhook endpoint
app.post('/api/email/webhook', handleEmailWebhook)

// Test webhook endpoint - logs what's received without verification
app.post('/api/email/test-webhook', (req, res) => {
  const payload = req.body?.toString() || 'empty'
  console.log('[TEST WEBHOOK] ════════════════════════════════════════')
  console.log('[TEST WEBHOOK] Content-Type:', req.headers['content-type'])
  console.log('[TEST WEBHOOK] Svix-ID:', req.headers['svix-id'])
  console.log('[TEST WEBHOOK] Payload length:', payload.length)
  console.log('[TEST WEBHOOK] Payload:', payload.substring(0, 500))
  console.log('[TEST WEBHOOK] ════════════════════════════════════════')

  res.json({
    received: true,
    contentType: req.headers['content-type'],
    hasSignature: !!req.headers['svix-signature'],
    payloadLength: payload.length,
    payloadPreview: payload.substring(0, 100),
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⚡ BYTE EMAIL SERVICE                                       ║
║                                                               ║
║   Status:   Running                                           ║
║   Port:     ${PORT}                                              ║
║   Endpoint: /api/email/webhook                                ║
║                                                               ║
║   Email:    byte@chrisleebergstrom.com                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `)
})
