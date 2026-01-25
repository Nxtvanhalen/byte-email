import express from 'express'
import { handleEmailWebhook } from './handlers/email'

const app = express()
const PORT = process.env.PORT || 3000

// Raw body needed for webhook signature verification
app.use('/api/email/webhook', express.raw({ type: 'application/json' }))
app.use(express.json())

// ═══════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Byte Email',
    status: 'operational',
    timestamp: new Date().toISOString()
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
    timestamp: new Date().toISOString()
  })
})

// Email webhook endpoint
app.post('/api/email/webhook', handleEmailWebhook)

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
