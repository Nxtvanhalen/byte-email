import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const BYTE_EMAIL = 'byte@chrisleebergstrom.com'
const BYTE_NAME = 'Byte AI'

interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendByteReply(options: SendEmailOptions): Promise<void> {
  const { to, subject, text, html } = options

  try {
    const result = await resend.emails.send({
      from: `${BYTE_NAME} <${BYTE_EMAIL}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
      replyTo: BYTE_EMAIL
    })

    if (result.error) {
      console.error('[RESEND] Error sending email:', result.error)
      throw new Error(result.error.message)
    }

    console.log(`[RESEND] ✓ Email sent to ${to} (id: ${result.data?.id})`)

  } catch (error) {
    console.error('[RESEND] Failed to send email:', error)
    throw error
  }
}
