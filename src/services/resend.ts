import { Resend } from 'resend'
import { withRetry } from '../lib/retry'
import { logger } from '../lib/logger'

const log = logger.child({ service: 'resend' })

const resend = new Resend(process.env.RESEND_API_KEY)

const BYTE_EMAIL = 'byte@firstlyte.co'
const BYTE_NAME = 'Byte AI'

// Retry configuration for Resend
const RESEND_RETRY_OPTIONS = {
  maxAttempts: 2,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  onRetry: (attempt: number, error: Error) => {
    log.warn({ attempt, err: error.message }, 'Resend retry')
  },
}

interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendByteReply(
  options: SendEmailOptions,
): Promise<{ success: boolean; error?: string }> {
  const { to, subject, text, html } = options

  try {
    const result = await withRetry(async () => {
      const response = await resend.emails.send({
        from: `${BYTE_NAME} <${BYTE_EMAIL}>`,
        to: to,
        subject: subject,
        text: text,
        html: html,
        replyTo: BYTE_EMAIL,
      })

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response
    }, RESEND_RETRY_OPTIONS)

    log.info({ to, emailId: result.data?.id }, 'Email sent')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    log.error({ to, err: errorMessage }, 'Failed to send email after retries')
    return { success: false, error: errorMessage }
  }
}

/**
 * Send an error notification email
 */
export async function sendErrorEmail(options: {
  to: string
  subject: string
  text: string
  html: string
}): Promise<void> {
  try {
    await resend.emails.send({
      from: `${BYTE_NAME} <${BYTE_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: BYTE_EMAIL,
    })
    log.info({ to: options.to }, 'Error notification sent')
  } catch (error) {
    // Don't throw on error email failure - just log
    log.error({ err: error, to: options.to }, 'Failed to send error email')
  }
}

/**
 * Send a "thinking" acknowledgment email
 */
export async function sendThinkingAck(options: {
  to: string
  subject: string
  text: string
  html: string
}): Promise<void> {
  try {
    await resend.emails.send({
      from: `${BYTE_NAME} <${BYTE_EMAIL}>`,
      to: options.to,
      subject: `[Thinking] ${options.subject}`,
      text: options.text,
      html: options.html,
      replyTo: BYTE_EMAIL,
    })
    log.info({ to: options.to }, 'Thinking acknowledgment sent')
  } catch (error) {
    // Don't throw on ack failure - the real response will come later
    log.error({ err: error, to: options.to }, 'Failed to send thinking ack')
  }
}
