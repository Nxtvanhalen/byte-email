import { Request, Response } from 'express'
import { Webhook } from 'svix'
import { redis } from '../services/redis'
import { generateByteResponse } from '../services/claude'
import { sendByteReply } from '../services/resend'
import { formatByteEmailHtml } from '../lib/email-template'

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BYTE_EMAIL = 'byte@chrisleebergstrom.com'
const RATE_LIMIT_PER_HOUR = 15
const RATE_LIMIT_PER_DAY = 50

interface EmailReceivedEvent {
  type: 'email.received'
  data: {
    email_id: string
    from: string
    to: string | string[]
    subject: string
    attachments?: Array<{ id: string; filename: string; content_type: string }>
  }
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  channel: 'email'
  timestamp: number
  metadata?: Record<string, any>
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handleEmailWebhook(req: Request, res: Response) {
  const startTime = Date.now()

  console.log('[BYTE EMAIL] ════════════════════════════════════════')
  console.log('[BYTE EMAIL] Webhook received')

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY WEBHOOK SIGNATURE
    // ─────────────────────────────────────────────────────────────────────────

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    console.log('[BYTE EMAIL] Webhook secret configured:', webhookSecret ? 'YES' : 'NO')

    if (!webhookSecret) {
      console.error('[BYTE EMAIL] ❌ Missing RESEND_WEBHOOK_SECRET')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const svixId = req.headers['svix-id'] as string
    const svixTimestamp = req.headers['svix-timestamp'] as string
    const svixSignature = req.headers['svix-signature'] as string

    console.log('[BYTE EMAIL] Headers - svix-id:', svixId ? 'present' : 'missing')
    console.log('[BYTE EMAIL] Headers - svix-timestamp:', svixTimestamp ? 'present' : 'missing')
    console.log('[BYTE EMAIL] Headers - svix-signature:', svixSignature ? 'present' : 'missing')

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[BYTE EMAIL] ❌ Missing webhook headers')
      return res.status(401).json({ error: 'Missing webhook headers' })
    }

    const wh = new Webhook(webhookSecret)
    let event: EmailReceivedEvent

    try {
      const payload = req.body.toString()
      console.log('[BYTE EMAIL] Payload length:', payload.length)
      console.log('[BYTE EMAIL] Payload preview:', payload.substring(0, 200))

      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as EmailReceivedEvent

      console.log('[BYTE EMAIL] ✓ Webhook verified successfully')
      console.log('[BYTE EMAIL] Event type:', event.type)
    } catch (err) {
      console.error('[BYTE EMAIL] ❌ Webhook verification failed:', err)
      return res.status(401).json({ error: 'Invalid webhook signature' })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK EVENT TYPE
    // ─────────────────────────────────────────────────────────────────────────

    if (event.type !== 'email.received') {
      console.log(`[BYTE EMAIL] Ignoring event type: ${event.type}`)
      return res.json({ received: true, processed: false })
    }

    const { email_id, from, to, subject, attachments } = event.data
    const toAddress = (Array.isArray(to) ? to[0] : to).toLowerCase()

    // ─────────────────────────────────────────────────────────────────────────
    // ROUTE: Is this email for Byte?
    // ─────────────────────────────────────────────────────────────────────────

    if (!toAddress.includes('byte@')) {
      console.log(`[BYTE EMAIL] Email not for Byte (to: ${toAddress}), skipping`)
      return res.json({ received: true, processed: false, reason: 'not_for_byte' })
    }

    console.log(`\n${'═'.repeat(60)}`)
    console.log(`[BYTE EMAIL] 📧 NEW EMAIL`)
    console.log(`${'═'.repeat(60)}`)
    console.log(`[BYTE EMAIL] From:    ${from}`)
    console.log(`[BYTE EMAIL] Subject: ${subject}`)
    console.log(`[BYTE EMAIL] ID:      ${email_id}`)

    // ─────────────────────────────────────────────────────────────────────────
    // RATE LIMITING
    // ─────────────────────────────────────────────────────────────────────────

    const rateLimitResult = await checkRateLimit(from)
    if (!rateLimitResult.allowed) {
      console.log(`[BYTE EMAIL] ⚠️ Rate limited: ${from} (${rateLimitResult.reason})`)

      // Optionally send a "slow down" email
      await sendByteReply({
        to: from,
        subject: `Byte Email | Re: ${subject}`,
        text: "Hey, you're sending emails faster than I can think! Give me a bit and try again later.\n\n— Byte",
        html: formatByteEmailHtml("Hey, you're sending emails faster than I can think! Give me a bit and try again later.\n\n— Byte")
      })

      return res.json({ received: true, processed: false, reason: 'rate_limited' })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH FULL EMAIL CONTENT
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[BYTE EMAIL] Fetching email content...`)

    const emailContent = await fetchEmailContent(email_id)
    if (!emailContent) {
      console.error(`[BYTE EMAIL] Failed to fetch email content`)
      return res.status(500).json({ error: 'Failed to fetch email content' })
    }

    console.log(`[BYTE EMAIL] Content length: ${emailContent.length} chars`)

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE ATTACHMENTS (graceful notice for now)
    // ─────────────────────────────────────────────────────────────────────────

    let attachmentNote = ''
    if (attachments && attachments.length > 0) {
      const fileNames = attachments.map(a => a.filename).join(', ')
      attachmentNote = `\n\n[This email has ${attachments.length} attachment(s): ${fileNames}. I can't process attachments yet, but I'm happy to help with the text content of your email.]`
      console.log(`[BYTE EMAIL] Attachments: ${fileNames}`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONVERSATION THREADING
    // ─────────────────────────────────────────────────────────────────────────

    const cleanSubject = subject
      .replace(/^(re:|fwd:|fw:)\s*/gi, '')
      .replace(/^byte email\s*\|\s*/gi, '')
      .trim()

    const threadId = `email:${Buffer.from(cleanSubject + from).toString('base64').slice(0, 24)}`
    const conversationKey = `byte:conversation:${threadId}`

    let history: ConversationMessage[] = await redis.get(conversationKey) || []

    // Add incoming message
    history.push({
      role: 'user',
      content: emailContent,
      channel: 'email',
      timestamp: Date.now(),
      metadata: { from, subject, emailId: email_id }
    })

    console.log(`[BYTE EMAIL] Thread: ${threadId} (${history.length} messages)`)

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE BYTE'S RESPONSE
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[BYTE EMAIL] Generating response...`)

    const byteResponse = await generateByteResponse({
      messages: history,
      from,
      subject,
      attachmentNote
    })

    console.log(`[BYTE EMAIL] Response length: ${byteResponse.length} chars`)

    // ─────────────────────────────────────────────────────────────────────────
    // STORE IN REDIS
    // ─────────────────────────────────────────────────────────────────────────

    history.push({
      role: 'assistant',
      content: byteResponse,
      channel: 'email',
      timestamp: Date.now()
    })

    // Keep last 50 messages, expire after 30 days
    await redis.set(conversationKey, history.slice(-50), { ex: 60 * 60 * 24 * 30 })

    // Index for cross-channel awareness (voice/chat can see email threads)
    await redis.zadd('byte:conversations:all', { score: Date.now(), member: threadId })

    console.log(`[BYTE EMAIL] Conversation saved to Redis`)

    // ─────────────────────────────────────────────────────────────────────────
    // SEND REPLY
    // ─────────────────────────────────────────────────────────────────────────

    const replySubject = subject.toLowerCase().startsWith('re:')
      ? `Byte Email | ${subject}`
      : `Byte Email | Re: ${subject}`

    await sendByteReply({
      to: from,
      subject: replySubject,
      text: byteResponse,
      html: formatByteEmailHtml(byteResponse)
    })

    const duration = Date.now() - startTime
    console.log(`[BYTE EMAIL] ✅ Replied to ${from} (${duration}ms)`)
    console.log(`${'═'.repeat(60)}\n`)

    return res.json({
      received: true,
      processed: true,
      replied: true,
      duration_ms: duration
    })

  } catch (error) {
    console.error('[BYTE EMAIL] ❌ Error processing email:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function checkRateLimit(from: string): Promise<{ allowed: boolean; reason?: string }> {
  const hourKey = `byte:email:rate:hour:${from}`
  const dayKey = `byte:email:rate:day:${from}`

  // Check hourly limit
  const hourlyCount = await redis.incr(hourKey)
  if (hourlyCount === 1) {
    await redis.expire(hourKey, 3600) // 1 hour
  }

  if (hourlyCount > RATE_LIMIT_PER_HOUR) {
    return { allowed: false, reason: `hourly limit (${RATE_LIMIT_PER_HOUR})` }
  }

  // Check daily limit
  const dailyCount = await redis.incr(dayKey)
  if (dailyCount === 1) {
    await redis.expire(dayKey, 86400) // 24 hours
  }

  if (dailyCount > RATE_LIMIT_PER_DAY) {
    return { allowed: false, reason: `daily limit (${RATE_LIMIT_PER_DAY})` }
  }

  return { allowed: true }
}

async function fetchEmailContent(emailId: string): Promise<string | null> {
  try {
    // Use /emails/receiving/ endpoint for inbound emails (not /emails/)
    const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[BYTE EMAIL] Resend API error: ${response.status}`, errorText)
      return null
    }

    const email = await response.json() as { text?: string; html?: string }

    // Prefer plain text, fall back to stripped HTML
    if (email.text) {
      return email.text
    }

    if (email.html) {
      return stripHtml(email.html)
    }

    return 'No content'
  } catch (error) {
    console.error('[BYTE EMAIL] Error fetching email:', error)
    return null
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
