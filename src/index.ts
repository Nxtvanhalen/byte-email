import { Hono } from 'hono'
import { handleEmailWebhook } from './handlers/email'
import { formatByteEmailHtml } from './lib/email-template'

const app = new Hono()
const PORT = process.env.PORT || 3000

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Byte Email',
    status: 'operational',
    runtime: 'bun',
    timestamp: new Date().toISOString(),
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy' })
})

// Debug endpoint - development only
app.get('/debug', (c) => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production' }, 403)
  }

  return c.json({
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
app.get('/preview', (c) => {
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

  return c.html(html)
})

// Email webhook endpoint
app.post('/api/email/webhook', handleEmailWebhook)

// Test webhook endpoint - logs what's received without verification
app.post('/api/email/test-webhook', async (c) => {
  const payload = await c.req.text()
  console.log('[TEST WEBHOOK] ════════════════════════════════════════')
  console.log('[TEST WEBHOOK] Content-Type:', c.req.header('content-type'))
  console.log('[TEST WEBHOOK] Svix-ID:', c.req.header('svix-id'))
  console.log('[TEST WEBHOOK] Payload length:', payload.length)
  console.log('[TEST WEBHOOK] Payload:', payload.substring(0, 500))
  console.log('[TEST WEBHOOK] ════════════════════════════════════════')

  return c.json({
    received: true,
    contentType: c.req.header('content-type'),
    hasSignature: !!c.req.header('svix-signature'),
    payloadLength: payload.length,
    payloadPreview: payload.substring(0, 100),
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
})

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ⚡ BYTE EMAIL SERVICE                                       ║
║                                                               ║
║   Status:   Running                                           ║
║   Runtime:  Bun ${Bun.version}                                       ║
║   Port:     ${server.port}                                              ║
║   Endpoint: /api/email/webhook                                ║
║                                                               ║
║   Email:    byte@chrisleebergstrom.com                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`)
