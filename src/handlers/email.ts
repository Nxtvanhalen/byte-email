import type { Context } from 'hono'
import { Webhook } from 'svix'
import { redis } from '../services/redis'
import { generateByteResponse, detectThinkingTrigger } from '../services/claude'
import { sendByteReply, sendErrorEmail, sendThinkingAck } from '../services/resend'
import { formatByteEmailHtml } from '../lib/email-template'
import {
  formatErrorEmailHtml,
  formatErrorEmailText,
  formatThinkingAckHtml,
  formatThinkingAckText,
} from '../lib/error-templates'
import {
  processAttachments,
  formatAttachmentsForPrompt,
  getImageAttachments,
  getPdfAttachments,
} from '../services/attachments'

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

export async function handleEmailWebhook(c: Context) {
  const startTime = Date.now()

  console.log('[BYTE EMAIL] ════════════════════════════════════════')
  console.log('[BYTE EMAIL] Webhook received')

  // Store sender info for error handling
  let senderEmail: string | null = null
  let emailSubject: string | null = null
  let cleanSubject: string | null = null

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY WEBHOOK SIGNATURE
    // ─────────────────────────────────────────────────────────────────────────

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    console.log('[BYTE EMAIL] Webhook secret configured:', webhookSecret ? 'YES' : 'NO')

    if (!webhookSecret) {
      console.error('[BYTE EMAIL] ❌ Missing RESEND_WEBHOOK_SECRET')
      return c.json({ error: 'Server configuration error' }, 500)
    }

    const svixId = c.req.header('svix-id')
    const svixTimestamp = c.req.header('svix-timestamp')
    const svixSignature = c.req.header('svix-signature')

    console.log('[BYTE EMAIL] Headers - svix-id:', svixId ? 'present' : 'missing')
    console.log('[BYTE EMAIL] Headers - svix-timestamp:', svixTimestamp ? 'present' : 'missing')
    console.log('[BYTE EMAIL] Headers - svix-signature:', svixSignature ? 'present' : 'missing')

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[BYTE EMAIL] ❌ Missing webhook headers')
      return c.json({ error: 'Missing webhook headers' }, 401)
    }

    const wh = new Webhook(webhookSecret)
    let event: EmailReceivedEvent

    try {
      const payload = await c.req.text()
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
      return c.json({ error: 'Invalid webhook signature' }, 401)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK EVENT TYPE
    // ─────────────────────────────────────────────────────────────────────────

    if (event.type !== 'email.received') {
      console.log(`[BYTE EMAIL] Ignoring event type: ${event.type}`)
      return c.json({ received: true, processed: false })
    }

    const { email_id, from, to, subject, attachments } = event.data
    const toAddress = (Array.isArray(to) ? to[0] : to).toLowerCase()

    // Store for error handling
    senderEmail = from
    emailSubject = subject
    cleanSubject = subject
      .replace(/^(re:|fwd:|fw:)\s*/gi, '')
      .replace(/^byte email\s*\|\s*/gi, '')
      .replace(/^\[thinking\]\s*/gi, '')
      .trim()

    // ─────────────────────────────────────────────────────────────────────────
    // ROUTE: Is this email for Byte?
    // ─────────────────────────────────────────────────────────────────────────

    if (!toAddress.includes('byte@')) {
      console.log(`[BYTE EMAIL] Email not for Byte (to: ${toAddress}), skipping`)
      return c.json({ received: true, processed: false, reason: 'not_for_byte' })
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

    const rateLimitResult = await checkRateLimitSafe(from)
    if (!rateLimitResult.allowed) {
      console.log(`[BYTE EMAIL] ⚠️ Rate limited: ${from} (${rateLimitResult.reason})`)

      // Send styled rate limit email
      await sendErrorEmail({
        to: from,
        subject: `Re: ${cleanSubject}`,
        text: formatErrorEmailText({ type: 'rate_limit' }),
        html: formatErrorEmailHtml({ type: 'rate_limit' }),
      })

      return c.json({ received: true, processed: false, reason: 'rate_limited' })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FETCH FULL EMAIL CONTENT
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[BYTE EMAIL] Fetching email content...`)

    const emailContent = await fetchEmailContent(email_id)
    if (!emailContent) {
      console.error(`[BYTE EMAIL] Failed to fetch email content`)

      await sendErrorEmail({
        to: from,
        subject: `Re: ${cleanSubject}`,
        text: formatErrorEmailText({
          type: 'api_error',
          details: 'Could not retrieve email content',
        }),
        html: formatErrorEmailHtml({
          type: 'api_error',
          details: 'Could not retrieve email content',
          retrying: false,
        }),
      })

      return c.json({ error: 'Failed to fetch email content' }, 500)
    }

    console.log(`[BYTE EMAIL] Content length: ${emailContent.length} chars`)

    // ─────────────────────────────────────────────────────────────────────────
    // DETECT THINKING TRIGGER
    // ─────────────────────────────────────────────────────────────────────────

    const { triggered: useThinking, cleanedContent } = detectThinkingTrigger(emailContent)

    if (useThinking) {
      console.log(`[BYTE EMAIL] 🧠 THINKING MODE ACTIVATED`)

      // Send immediate acknowledgment for thinking mode
      await sendThinkingAck({
        to: from,
        subject: cleanSubject,
        text: formatThinkingAckText(cleanSubject),
        html: formatThinkingAckHtml(cleanSubject),
      })
    }

    // Use cleaned content (with "Think" removed if triggered)
    const processedEmailContent = cleanedContent

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE ATTACHMENTS (with graceful degradation)
    // ─────────────────────────────────────────────────────────────────────────

    let attachmentContext = ''
    let processedImages: Awaited<ReturnType<typeof processAttachments>> = []
    let processedPdfs: Awaited<ReturnType<typeof processAttachments>> = []
    let attachmentWarning = ''

    if (attachments && attachments.length > 0) {
      const fileNames = attachments.map((a) => a.filename).join(', ')
      console.log(`[BYTE EMAIL] Processing attachments: ${fileNames}`)

      try {
        const processed = await processAttachments(email_id, attachments)

        // Get text content from Excel (PDFs now go through Claude vision)
        attachmentContext = formatAttachmentsForPrompt(processed)

        // Get images for vision API
        processedImages = getImageAttachments(processed)

        // Get PDFs for Claude native document understanding
        processedPdfs = getPdfAttachments(processed)

        // Check for failures
        const failed = processed.filter((p) => p.error)
        if (failed.length > 0) {
          const failedNames = failed.map((f) => f.filename).join(', ')
          attachmentWarning = `\n\n[Note: I couldn't process some attachments: ${failedNames}. The rest of your message is fine.]`
          console.log(`[BYTE EMAIL] ⚠️ Some attachments failed: ${failedNames}`)
        }

        console.log(
          `[BYTE EMAIL] Processed: ${processed.length} attachments (${processedImages.length} images)`,
        )
      } catch (attachmentError) {
        console.error('[BYTE EMAIL] ⚠️ Attachment processing failed entirely:', attachmentError)
        attachmentWarning = `\n\n[Note: I couldn't process your attachments, but I'll respond to your message.]`
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONVERSATION THREADING (with graceful degradation)
    // ─────────────────────────────────────────────────────────────────────────

    const threadId = `email:${Buffer.from(cleanSubject + from)
      .toString('base64')
      .slice(0, 24)}`
    const conversationKey = `byte:conversation:${threadId}`

    let history: ConversationMessage[] = []
    let redisAvailable = true

    try {
      history = (await redis.get(conversationKey)) || []
    } catch (redisError) {
      console.error('[BYTE EMAIL] ⚠️ Redis unavailable, continuing without history:', redisError)
      redisAvailable = false
    }

    // Add incoming message (use cleaned content without "Think" trigger)
    history.push({
      role: 'user',
      content: processedEmailContent,
      channel: 'email',
      timestamp: Date.now(),
      metadata: { from, subject, emailId: email_id, thinkingRequested: useThinking },
    })

    console.log(
      `[BYTE EMAIL] Thread: ${threadId} (${history.length} messages)${!redisAvailable ? ' [NO HISTORY - Redis down]' : ''}`,
    )

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE BYTE'S RESPONSE
    // ─────────────────────────────────────────────────────────────────────────

    console.log(
      `[BYTE EMAIL] Generating response...${useThinking ? ' (with extended thinking)' : ''}`,
    )

    let byteResponse: string

    try {
      byteResponse = await generateByteResponse({
        messages: history,
        from,
        subject,
        attachmentContext: attachmentContext || undefined,
        images: processedImages.length > 0 ? processedImages : undefined,
        pdfs: processedPdfs.length > 0 ? processedPdfs : undefined,
        useThinking,
      })

      // Add attachment warning if needed
      if (attachmentWarning) {
        byteResponse = byteResponse.replace(/— Byte.*$/s, attachmentWarning + '\n\n— Byte')
      }
    } catch (claudeError) {
      console.error('[BYTE EMAIL] ❌ Claude API failed:', claudeError)

      // Send styled API error email
      await sendErrorEmail({
        to: from,
        subject: `Re: ${cleanSubject}`,
        text: formatErrorEmailText({ type: 'api_error', retrying: false }),
        html: formatErrorEmailHtml({ type: 'api_error', retrying: false }),
      })

      return c.json({ error: 'AI response generation failed' }, 500)
    }

    console.log(`[BYTE EMAIL] Response length: ${byteResponse.length} chars`)

    // ─────────────────────────────────────────────────────────────────────────
    // STORE IN REDIS (graceful degradation)
    // ─────────────────────────────────────────────────────────────────────────

    if (redisAvailable) {
      try {
        history.push({
          role: 'assistant',
          content: byteResponse,
          channel: 'email',
          timestamp: Date.now(),
        })

        // Keep last 50 messages, expire after 30 days
        await redis.set(conversationKey, history.slice(-50), { ex: 60 * 60 * 24 * 30 })

        // Index for cross-channel awareness (voice/chat can see email threads)
        await redis.zadd('byte:conversations:all', { score: Date.now(), member: threadId })

        console.log(`[BYTE EMAIL] Conversation saved to Redis`)
      } catch (redisSaveError) {
        console.error('[BYTE EMAIL] ⚠️ Failed to save to Redis (non-fatal):', redisSaveError)
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEND REPLY
    // ─────────────────────────────────────────────────────────────────────────

    const replySubject = `Re: ${cleanSubject}`

    const sendResult = await sendByteReply({
      to: from,
      subject: replySubject,
      text:
        byteResponse +
        `\n\n---\nOn ${new Date().toLocaleDateString()}, you wrote:\n> ${processedEmailContent.replace(/\n/g, '\n> ')}`,
      html: formatByteEmailHtml(byteResponse, {
        originalMessage: processedEmailContent,
        originalFrom: from,
        originalSubject: subject,
        originalDate: new Date(),
      }),
    })

    if (!sendResult.success) {
      console.error('[BYTE EMAIL] ❌ Failed to send reply:', sendResult.error)

      // Try to send error notification (different email)
      await sendErrorEmail({
        to: from,
        subject: `Re: ${cleanSubject}`,
        text: formatErrorEmailText({ type: 'send_failed', retrying: true }),
        html: formatErrorEmailHtml({ type: 'send_failed', retrying: true }),
      })

      return c.json({ error: 'Failed to send reply' }, 500)
    }

    const duration = Date.now() - startTime
    console.log(`[BYTE EMAIL] ✅ Replied to ${from} (${duration}ms)`)
    console.log(`${'═'.repeat(60)}\n`)

    return c.json({
      received: true,
      processed: true,
      replied: true,
      duration_ms: duration,
    })
  } catch (error) {
    console.error('[BYTE EMAIL] ❌ Unexpected error:', error)

    // Try to notify user if we have their email
    if (senderEmail && cleanSubject) {
      try {
        await sendErrorEmail({
          to: senderEmail,
          subject: `Re: ${cleanSubject}`,
          text: formatErrorEmailText({
            type: 'unknown',
            details: error instanceof Error ? error.message : undefined,
          }),
          html: formatErrorEmailHtml({
            type: 'unknown',
            details: error instanceof Error ? error.message : undefined,
          }),
        })
      } catch (notifyError) {
        console.error('[BYTE EMAIL] Could not send error notification:', notifyError)
      }
    }

    return c.json({ error: 'Internal server error' }, 500)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check rate limit with graceful degradation if Redis is down
 */
async function checkRateLimitSafe(from: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    return await checkRateLimit(from)
  } catch (error) {
    console.error('[BYTE EMAIL] ⚠️ Rate limit check failed (allowing request):', error)
    // If Redis is down, allow the request but log it
    return { allowed: true }
  }
}

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
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[BYTE EMAIL] Resend API error: ${response.status}`, errorText)
      return null
    }

    const email = (await response.json()) as { text?: string; html?: string }

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
