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
import { withRetry } from '../lib/retry'
import { createRequestLogger } from '../lib/logger'

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const RATE_LIMIT_PER_HOUR = 15
const RATE_LIMIT_PER_DAY = 50
const GLOBAL_RATE_LIMIT_PER_HOUR = 500
const IDEMPOTENCY_TTL = 86400 // 24 hours
const MAX_EMAIL_BODY_CHARS = 100_000 // ~100KB — prevents token blowout
const MAX_ATTACHMENTS = 5 // Cap attachments per email

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
  metadata?: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handleEmailWebhook(c: Context) {
  const startTime = Date.now()
  const log = createRequestLogger({ handler: 'webhook' })

  log.info('Webhook received')

  // Store sender info for error handling
  let senderEmail: string | null = null
  let cleanSubject: string | null = null

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY WEBHOOK SIGNATURE
    // ─────────────────────────────────────────────────────────────────────────

    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    if (!webhookSecret) {
      log.error('Missing RESEND_WEBHOOK_SECRET')
      return c.json({ error: 'Server configuration error' }, 500)
    }

    const svixId = c.req.header('svix-id')
    const svixTimestamp = c.req.header('svix-timestamp')
    const svixSignature = c.req.header('svix-signature')

    log.debug(
      {
        svixId: svixId ? 'present' : 'missing',
        svixTimestamp: svixTimestamp ? 'present' : 'missing',
        svixSignature: svixSignature ? 'present' : 'missing',
      },
      'Webhook headers',
    )

    if (!svixId || !svixTimestamp || !svixSignature) {
      log.error('Missing webhook headers')
      return c.json({ error: 'Missing webhook headers' }, 401)
    }

    const wh = new Webhook(webhookSecret)
    let event: EmailReceivedEvent

    try {
      const payload = await c.req.text()
      log.debug({ payloadLength: payload.length }, 'Verifying webhook payload')

      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as EmailReceivedEvent

      log.info({ eventType: event.type }, 'Webhook verified')
    } catch (err) {
      log.error({ err }, 'Webhook verification failed')
      return c.json({ error: 'Invalid webhook signature' }, 401)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHECK EVENT TYPE
    // ─────────────────────────────────────────────────────────────────────────

    if (event.type !== 'email.received') {
      log.info({ eventType: event.type }, 'Ignoring non-email event')
      return c.json({ received: true, processed: false })
    }

    const { email_id, from, to, subject, attachments } = event.data
    const toAddress = (Array.isArray(to) ? to[0] : to).toLowerCase()

    // Store for error handling
    senderEmail = from
    cleanSubject = subject
      .replace(/^(re:|fwd:|fw:)\s*/gi, '')
      .replace(/^byte email\s*\|\s*/gi, '')
      .replace(/^\[thinking\]\s*/gi, '')
      .trim()

    // Create a request-scoped logger with email context
    const emailLog = createRequestLogger({
      handler: 'email',
      emailId: email_id,
      from,
      subject: cleanSubject,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // ROUTE: Is this email for Byte?
    // ─────────────────────────────────────────────────────────────────────────

    if (!toAddress.includes('byte@')) {
      emailLog.info({ to: toAddress }, 'Email not for Byte, skipping')
      return c.json({ received: true, processed: false, reason: 'not_for_byte' })
    }

    emailLog.info('Processing new email')

    // ─────────────────────────────────────────────────────────────────────────
    // IDEMPOTENCY CHECK (prevent duplicate processing on webhook retries)
    // ─────────────────────────────────────────────────────────────────────────

    try {
      const idempotencyKey = `byte:email:processed:${email_id}`
      const alreadyProcessed = await redis.set(idempotencyKey, Date.now(), {
        nx: true,
        ex: IDEMPOTENCY_TTL,
      })

      if (!alreadyProcessed) {
        emailLog.warn('Duplicate webhook detected, skipping')
        return c.json({ received: true, processed: false, reason: 'duplicate' })
      }
    } catch (idempotencyError) {
      // Fail open — if Redis is down, process anyway (risk of duplicate is better than dropping)
      emailLog.warn({ err: idempotencyError }, 'Idempotency check failed (processing anyway)')
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RATE LIMITING
    // ─────────────────────────────────────────────────────────────────────────

    const rateLimitResult = await checkRateLimitSafe(from, emailLog)
    if (!rateLimitResult.allowed) {
      emailLog.warn({ reason: rateLimitResult.reason }, 'Rate limited')

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

    emailLog.info('Fetching email content')

    const emailContent = await fetchEmailContent(email_id, emailLog)
    if (!emailContent) {
      emailLog.error('Failed to fetch email content')

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

    emailLog.info({ contentLength: emailContent.length }, 'Email content fetched')

    // ─────────────────────────────────────────────────────────────────────────
    // DETECT THINKING TRIGGER
    // ─────────────────────────────────────────────────────────────────────────

    const { triggered: useThinking, cleanedContent } = detectThinkingTrigger(emailContent)

    if (useThinking) {
      emailLog.info('Thinking mode activated')

      await sendThinkingAck({
        to: from,
        subject: cleanSubject,
        text: formatThinkingAckText(cleanSubject),
        html: formatThinkingAckHtml(cleanSubject),
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INPUT SIZE GUARD (prevent token blowout)
    // ─────────────────────────────────────────────────────────────────────────

    let processedEmailContent = cleanedContent

    if (processedEmailContent.length > MAX_EMAIL_BODY_CHARS) {
      emailLog.warn(
        { originalLength: processedEmailContent.length, maxLength: MAX_EMAIL_BODY_CHARS },
        'Email body truncated',
      )
      processedEmailContent =
        processedEmailContent.slice(0, MAX_EMAIL_BODY_CHARS) +
        '\n\n[Content truncated — email exceeded maximum length]'
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HANDLE ATTACHMENTS (with graceful degradation)
    // ─────────────────────────────────────────────────────────────────────────

    let attachmentContext = ''
    let processedImages: Awaited<ReturnType<typeof processAttachments>> = []
    let processedPdfs: Awaited<ReturnType<typeof processAttachments>> = []
    let attachmentWarning = ''

    // Cap attachment count to prevent abuse
    const cappedAttachments =
      attachments && attachments.length > MAX_ATTACHMENTS
        ? attachments.slice(0, MAX_ATTACHMENTS)
        : attachments

    if (cappedAttachments && cappedAttachments.length > 0) {
      if (attachments && attachments.length > MAX_ATTACHMENTS) {
        const processedNames = cappedAttachments.map((a) => a.filename).join(', ')
        const skippedNames = attachments
          .slice(MAX_ATTACHMENTS)
          .map((a) => a.filename)
          .join(', ')
        attachmentWarning =
          `\n\n[Heads up: You sent ${attachments.length} attachments but I can handle ${MAX_ATTACHMENTS} at a time. ` +
          `I analyzed: ${processedNames}. ` +
          `Skipped: ${skippedNames}. ` +
          `Feel free to send the rest in a follow-up and I'll take a look.]`
        emailLog.warn(
          { sent: attachments.length, processed: MAX_ATTACHMENTS, skipped: skippedNames },
          'Attachment count capped',
        )
      }

      const fileNames = cappedAttachments.map((a) => a.filename).join(', ')
      emailLog.info({ files: fileNames, count: cappedAttachments.length }, 'Processing attachments')

      try {
        const processed = await processAttachments(email_id, cappedAttachments)

        attachmentContext = formatAttachmentsForPrompt(processed)
        processedImages = getImageAttachments(processed)
        processedPdfs = getPdfAttachments(processed)

        const failed = processed.filter((p) => p.error)
        if (failed.length > 0) {
          const failedNames = failed.map((f) => f.filename).join(', ')
          attachmentWarning = `\n\n[Note: I couldn't process some attachments: ${failedNames}. The rest of your message is fine.]`
          emailLog.warn({ failedFiles: failedNames }, 'Some attachments failed')
        }

        emailLog.info(
          {
            total: processed.length,
            images: processedImages.length,
            pdfs: processedPdfs.length,
          },
          'Attachments processed',
        )
      } catch (attachmentError) {
        emailLog.error({ err: attachmentError }, 'Attachment processing failed entirely')
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
      emailLog.warn({ err: redisError }, 'Redis unavailable, continuing without history')
      redisAvailable = false
    }

    history.push({
      role: 'user',
      content: processedEmailContent,
      channel: 'email',
      timestamp: Date.now(),
      metadata: { from, subject, emailId: email_id, thinkingRequested: useThinking },
    })

    emailLog.info(
      { threadId, messageCount: history.length, redisAvailable },
      'Conversation thread loaded',
    )

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE BYTE'S RESPONSE
    // ─────────────────────────────────────────────────────────────────────────

    emailLog.info({ thinking: useThinking }, 'Generating response')

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

      if (attachmentWarning) {
        byteResponse = byteResponse.replace(/— Byte.*$/s, attachmentWarning + '\n\n— Byte')
      }
    } catch (claudeError) {
      emailLog.error({ err: claudeError }, 'Claude API failed')

      await sendErrorEmail({
        to: from,
        subject: `Re: ${cleanSubject}`,
        text: formatErrorEmailText({ type: 'api_error', retrying: false }),
        html: formatErrorEmailHtml({ type: 'api_error', retrying: false }),
      })

      return c.json({ error: 'AI response generation failed' }, 500)
    }

    emailLog.info({ responseLength: byteResponse.length }, 'Response generated')

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

        await redis.set(conversationKey, history.slice(-50), { ex: 60 * 60 * 24 * 30 })
        await redis.zadd('byte:conversations:all', { score: Date.now(), member: threadId })

        emailLog.info('Conversation saved to Redis')
      } catch (redisSaveError) {
        emailLog.warn({ err: redisSaveError }, 'Failed to save to Redis (non-fatal)')
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
      emailLog.error({ err: sendResult.error }, 'Failed to send reply')

      await sendErrorEmail({
        to: from,
        subject: `Re: ${cleanSubject}`,
        text: formatErrorEmailText({ type: 'send_failed', retrying: true }),
        html: formatErrorEmailHtml({ type: 'send_failed', retrying: true }),
      })

      return c.json({ error: 'Failed to send reply' }, 500)
    }

    const durationMs = Date.now() - startTime
    emailLog.info({ durationMs, replied: true }, 'Email processed successfully')

    return c.json({
      received: true,
      processed: true,
      replied: true,
      duration_ms: durationMs,
    })
  } catch (error) {
    log.error({ err: error }, 'Unexpected error in webhook handler')

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
        log.error({ err: notifyError }, 'Could not send error notification')
      }
    }

    return c.json({ error: 'Internal server error' }, 500)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IN-MEMORY FALLBACK RATE LIMITER (when Redis is down)
// ═══════════════════════════════════════════════════════════════════════════

// Simple sliding window: tracks timestamps per sender + global
const memoryRateLimit = {
  global: [] as number[],
  senders: new Map<string, number[]>(),

  check(from: string): { allowed: boolean; reason?: string } {
    const now = Date.now()
    const oneHourAgo = now - 3_600_000

    // Prune old global entries
    this.global = this.global.filter((t) => t > oneHourAgo)
    if (this.global.length >= GLOBAL_RATE_LIMIT_PER_HOUR) {
      return { allowed: false, reason: `global hourly limit (${GLOBAL_RATE_LIMIT_PER_HOUR})` }
    }

    // Prune old sender entries
    const senderTimes = (this.senders.get(from) || []).filter((t) => t > oneHourAgo)
    if (senderTimes.length >= RATE_LIMIT_PER_HOUR) {
      this.senders.set(from, senderTimes)
      return { allowed: false, reason: `hourly limit (${RATE_LIMIT_PER_HOUR})` }
    }

    // Record this request
    this.global.push(now)
    senderTimes.push(now)
    this.senders.set(from, senderTimes)

    return { allowed: true }
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function checkRateLimitSafe(
  from: string,
  log: ReturnType<typeof createRequestLogger>,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    return await checkRateLimit(from)
  } catch (error) {
    log.warn({ err: error }, 'Redis rate limit failed, using in-memory fallback')
    return memoryRateLimit.check(from)
  }
}

async function checkRateLimit(from: string): Promise<{ allowed: boolean; reason?: string }> {
  // Global rate limit — protects Claude API budget from burst traffic
  const globalKey = 'byte:email:rate:global:hour'
  const globalCount = await redis.incr(globalKey)
  if (globalCount === 1) {
    await redis.expire(globalKey, 3600)
  }

  if (globalCount > GLOBAL_RATE_LIMIT_PER_HOUR) {
    return { allowed: false, reason: `global hourly limit (${GLOBAL_RATE_LIMIT_PER_HOUR})` }
  }

  // Per-sender rate limits
  const hourKey = `byte:email:rate:hour:${from}`
  const dayKey = `byte:email:rate:day:${from}`

  const hourlyCount = await redis.incr(hourKey)
  if (hourlyCount === 1) {
    await redis.expire(hourKey, 3600)
  }

  if (hourlyCount > RATE_LIMIT_PER_HOUR) {
    return { allowed: false, reason: `hourly limit (${RATE_LIMIT_PER_HOUR})` }
  }

  const dailyCount = await redis.incr(dayKey)
  if (dailyCount === 1) {
    await redis.expire(dayKey, 86400)
  }

  if (dailyCount > RATE_LIMIT_PER_DAY) {
    return { allowed: false, reason: `daily limit (${RATE_LIMIT_PER_DAY})` }
  }

  return { allowed: true }
}

async function fetchEmailContent(
  emailId: string,
  log: ReturnType<typeof createRequestLogger>,
): Promise<string | null> {
  try {
    const email = await withRetry(
      async () => {
        const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          const err = new Error(`Resend API ${response.status}: ${errorText}`)
          ;(err as any).status = response.status
          throw err
        }

        return (await response.json()) as { text?: string; html?: string }
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        onRetry: (attempt, error) => {
          log.warn({ attempt, err: error.message }, 'Email fetch retry')
        },
      },
    )

    if (email.text) {
      return email.text
    }

    if (email.html) {
      return stripHtml(email.html)
    }

    return 'No content'
  } catch (error) {
    log.error({ err: error }, 'Email fetch failed after retries')
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
