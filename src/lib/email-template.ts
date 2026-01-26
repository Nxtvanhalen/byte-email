/**
 * Formats Byte's response as a styled HTML email
 */

interface EmailTemplateOptions {
  response: string
  originalMessage?: string
  originalFrom?: string
  originalSubject?: string
  originalDate?: Date
}

export function formatByteEmailHtml(text: string, options?: Omit<EmailTemplateOptions, 'response'>): string {
  // Escape HTML entities first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Convert markdown-style formatting
  html = html
    // Code blocks (```code```)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre style="background:#1a1a2e;color:#e0e0e0;padding:16px;border-radius:8px;overflow-x:auto;font-family:monospace;font-size:14px;margin:16px 0;"><code>${code.trim()}</code></pre>`
    })
    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f5;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:14px;color:#d63384;">$1</code>')
    // Bold (**text**)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic (*text*)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headers (## Header)
    .replace(/^### (.+)$/gm, '<h3 style="margin:20px 0 10px;font-size:16px;color:#1a1a2e;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:24px 0 12px;font-size:18px;color:#1a1a2e;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:28px 0 14px;font-size:20px;color:#1a1a2e;">$1</h1>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    .replace(/^• (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:4px 0;">$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p style="margin:16px 0;">')
    .replace(/\n/g, '<br>')

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
    return `<ul style="margin:12px 0;padding-left:24px;">${match}</ul>`
  })

  // Build quoted original message section
  let quotedSection = ''
  if (options?.originalMessage) {
    const date = options.originalDate
      ? options.originalDate.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : 'earlier'

    const from = options.originalFrom || 'you'
    const subject = options.originalSubject || ''

    // Escape and format the original message
    const quotedText = options.originalMessage
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')

    quotedSection = `
          <!-- Quoted Original Message -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #eee;">
              <p style="margin:0 0 12px;color:#666;font-size:13px;">
                On ${date}, <strong>${from}</strong> wrote${subject ? ` (${subject})` : ''}:
              </p>
              <div style="border-left:3px solid #ddd;padding-left:16px;color:#666;font-size:14px;line-height:1.6;">
                ${quotedText}
              </div>
            </td>
          </tr>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Byte Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:24px;">
        <table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:24px 32px;">
              <table role="presentation" style="width:100%;">
                <tr>
                  <td>
                    <span style="font-size:24px;margin-right:12px;">⚡</span>
                    <span style="color:#ffffff;font-size:20px;font-weight:600;letter-spacing:-0.5px;">Byte</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Byte's Response -->
          <tr>
            <td style="padding:32px;color:#333333;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 16px;">${html}</p>
            </td>
          </tr>
${quotedSection}
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f8f9fa;border-top:1px solid #eee;">
              <p style="margin:0;color:#888;font-size:12px;line-height:1.5;">
                Reply to this email to continue the conversation with Byte.
              </p>
            </td>
          </tr>
        </table>

        <!-- Sub-footer -->
        <table role="presentation" style="max-width:600px;margin:16px auto 0;">
          <tr>
            <td style="text-align:center;padding:8px;">
              <p style="margin:0;color:#999;font-size:11px;">
                Powered by Byte AI • chrisleebergstrom.com
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
