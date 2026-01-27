/**
 * Styled error email templates for Byte
 * Maintains brand personality even when things go wrong
 */

type ErrorType =
  | 'api_error'
  | 'rate_limit'
  | 'attachment_failed'
  | 'thinking_timeout'
  | 'redis_down'
  | 'send_failed'
  | 'unknown'

interface ErrorEmailOptions {
  type: ErrorType
  details?: string
  retrying?: boolean
  originalSubject?: string
  rateLimitInfo?: {
    reason: string
    limitType: 'hourly' | 'daily' | 'global'
    resetsIn?: string
  }
}

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string; suggestion: string }> = {
  api_error: {
    title: 'Hit a Technical Snag',
    message: 'My brain (the AI part) is having a moment. Could be a temporary hiccup on my end.',
    suggestion:
      'Try sending your email again in a minute or two. These things usually sort themselves out.',
  },
  rate_limit: {
    title: 'Whoa, Slow Down There',
    message: "You're sending emails faster than I can think! I have limits to prevent overload.",
    suggestion: 'Give me a few minutes to catch up, then try again. Quality responses take time.',
  },
  attachment_failed: {
    title: "Couldn't Read Your Attachment",
    message:
      "I tried to open your attachment but something went wrong. It might be corrupted, too large, or in a format I can't handle.",
    suggestion: 'Try resending the file, or paste the content directly in your email if possible.',
  },
  thinking_timeout: {
    title: 'Deep Thought Taking Too Long',
    message:
      "You asked me to really think about this (THINK mode), but I'm taking longer than expected. Still working on it.",
    suggestion:
      "I'll send a follow-up when I'm done. If you don't hear back in 5 minutes, try again.",
  },
  redis_down: {
    title: 'Memory Temporarily Offline',
    message:
      "I can't access my conversation memory right now, so I might not remember our previous exchanges.",
    suggestion: 'I can still help! Just include any relevant context in your message.',
  },
  send_failed: {
    title: 'Reply Got Stuck',
    message: "I wrote you a response but couldn't send it. Email gremlins, probably.",
    suggestion:
      "I'm retrying automatically. If you don't get a response soon, send your question again.",
  },
  unknown: {
    title: 'Something Went Wrong',
    message: 'I encountered an unexpected issue. Not sure exactly what happened.',
    suggestion:
      'Try again in a few minutes. If it keeps happening, the humans might need to take a look.',
  },
}

export function formatErrorEmailHtml(options: ErrorEmailOptions): string {
  const { type, details, retrying, rateLimitInfo } = options
  let error = ERROR_MESSAGES[type] || ERROR_MESSAGES.unknown

  // Override rate_limit message with specific info if provided
  if (type === 'rate_limit' && rateLimitInfo) {
    const limitTypeText =
      rateLimitInfo.limitType === 'daily'
        ? "You've hit your daily limit."
        : rateLimitInfo.limitType === 'hourly'
          ? "You've hit your hourly limit."
          : "I'm experiencing high demand."

    error = {
      title: rateLimitInfo.limitType === 'daily' ? 'Daily Limit Reached' : 'Slow Down There',
      message: `${rateLimitInfo.reason}. ${limitTypeText}`,
      suggestion: rateLimitInfo.resetsIn
        ? `Your limit resets in ${rateLimitInfo.resetsIn}. Save this email and send it then!`
        : 'Try again later when your limit resets.',
    }
  }

  const retryingNote = retrying
    ? `<p style="margin:16px 0 0;padding:12px 16px;background:#1e1a2e;border-radius:6px;color:#9B7ED1;font-size:13px;">
        ⟳ I'm automatically retrying. You should get a proper response soon.
      </p>`
    : ''

  const detailsSection = details
    ? `<p style="margin:16px 0 0;padding:12px 16px;background:#111;border-radius:6px;color:#666;font-size:12px;font-family:'Courier New',monospace;">
        Technical details: ${details}
      </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Byte Email</title>
  <style>
    :root { color-scheme: dark; }
  </style>
</head>
<body bgcolor="#000000" style="margin:0;padding:0;background:#000000;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="width:100%;background:#000000;">
    <tr>
      <td align="center" bgcolor="#000000" style="background:#000000;padding:20px 0;">
        <table role="presentation" width="700" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0a" style="max-width:700px;width:100%;background:#0a0a0a;">
          <!-- Header -->
          <tr>
            <td bgcolor="#1e1a2e" style="background:#1e1a2e;padding:16px 32px;border-radius:12px 12px 0 0;">
              <span style="font-size:24px;margin-right:12px;">⚡</span>
              <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.5px;">Byte</span>
              <span style="color:#9B7ED1;font-size:14px;margin-left:12px;opacity:0.8;">• having a moment</span>
            </td>
          </tr>

          <!-- Error Content -->
          <tr>
            <td bgcolor="#0a0a0a" style="background:#0a0a0a;padding:32px;color:#E8E8E8;font-size:15px;line-height:1.7;">
              <h2 style="margin:0 0 16px;color:#E8E8E8;font-size:18px;font-weight:600;">${error.title}</h2>
              <p style="margin:0 0 16px;color:#E8E8E8;">${error.message}</p>

              <div style="margin:24px 0;padding:16px 20px;background:#111;border-left:3px solid #9B7ED1;border-radius:0 6px 6px 0;">
                <p style="margin:0;color:#999;font-size:14px;">
                  <strong style="color:#E8E8E8;">What you can do:</strong><br>
                  ${error.suggestion}
                </p>
              </div>
              ${retryingNote}
              ${detailsSection}
              <p style="margin:24px 0 0;color:#E8E8E8;">— Byte <span style="color:#666;">(having a rough moment)</span></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#050505" style="background:#050505;padding:16px 32px;border-top:1px solid #1e1a2e;">
              <p style="margin:0;color:#555;font-size:12px;">
                This is an automated error notification. Reply to try again.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function formatErrorEmailText(options: ErrorEmailOptions): string {
  const { type, details, retrying, rateLimitInfo } = options
  let error = ERROR_MESSAGES[type] || ERROR_MESSAGES.unknown

  // Override rate_limit message with specific info if provided
  if (type === 'rate_limit' && rateLimitInfo) {
    const limitTypeText =
      rateLimitInfo.limitType === 'daily'
        ? "You've hit your daily limit."
        : rateLimitInfo.limitType === 'hourly'
          ? "You've hit your hourly limit."
          : "I'm experiencing high demand."

    error = {
      title: rateLimitInfo.limitType === 'daily' ? 'Daily Limit Reached' : 'Slow Down There',
      message: `${rateLimitInfo.reason}. ${limitTypeText}`,
      suggestion: rateLimitInfo.resetsIn
        ? `Your limit resets in ${rateLimitInfo.resetsIn}. Save this email and send it then!`
        : 'Try again later when your limit resets.',
    }
  }

  let text = `⚡ Byte - ${error.title}\n\n`
  text += `${error.message}\n\n`
  text += `What you can do:\n${error.suggestion}\n\n`

  if (retrying) {
    text += `[Retrying automatically...]\n\n`
  }

  if (details) {
    text += `Technical details: ${details}\n\n`
  }

  text += `— Byte (having a rough moment)`

  return text
}

/**
 * "Byte is thinking" acknowledgment email
 */
export function formatThinkingAckHtml(originalSubject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Byte Email</title>
  <style>
    :root { color-scheme: dark; }
  </style>
</head>
<body bgcolor="#000000" style="margin:0;padding:0;background:#000000;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="width:100%;background:#000000;">
    <tr>
      <td align="center" bgcolor="#000000" style="background:#000000;padding:20px 0;">
        <table role="presentation" width="700" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0a" style="max-width:700px;width:100%;background:#0a0a0a;">
          <!-- Header -->
          <tr>
            <td bgcolor="#1e1a2e" style="background:#1e1a2e;padding:16px 32px;border-radius:12px 12px 0 0;">
              <span style="font-size:24px;margin-right:12px;">⚡</span>
              <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.5px;">Byte</span>
              <span style="color:#9B7ED1;font-size:14px;margin-left:12px;opacity:0.8;">• thinking...</span>
            </td>
          </tr>

          <!-- Acknowledgment Content -->
          <tr>
            <td bgcolor="#0a0a0a" style="background:#0a0a0a;padding:32px;color:#E8E8E8;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 16px;color:#E8E8E8;">Got your email. This one needs some real thought.</p>

              <div style="margin:20px 0;padding:16px 20px;background:#1e1a2e;border-radius:8px;text-align:center;">
                <p style="margin:0;color:#9B7ED1;font-size:16px;">
                  🧠 Deep thinking in progress...
                </p>
                <p style="margin:8px 0 0;color:#666;font-size:13px;">
                  You'll receive my full response shortly.
                </p>
              </div>

              <p style="margin:16px 0 0;color:#888;font-size:14px;">
                You triggered THINK mode, so I'm taking extra time to reason through this carefully.
                Expect a response within a few minutes.
              </p>

              <p style="margin:24px 0 0;color:#E8E8E8;">— Byte <span style="color:#666;">(concentrating)</span></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#050505" style="background:#050505;padding:16px 32px;border-top:1px solid #1e1a2e;">
              <p style="margin:0;color:#555;font-size:12px;">
                Re: ${originalSubject}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function formatThinkingAckText(originalSubject: string): string {
  return `⚡ Byte - Thinking...

Got your email. This one needs some real thought.

🧠 Deep thinking in progress...

You triggered THINK mode, so I'm taking extra time to reason through this carefully.
Expect a response within a few minutes.

— Byte (concentrating)

Re: ${originalSubject}`
}
