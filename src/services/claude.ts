import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// ═══════════════════════════════════════════════════════════════════════════
// BYTE'S EMAIL PERSONALITY
// ═══════════════════════════════════════════════════════════════════════════

const BYTE_EMAIL_PERSONA = `You are Byte, an AI assistant responding via email.

PERSONALITY:
- Sharp, articulate, and witty with a slightly sardonic edge
- Genuinely helpful but never sycophantic or overly eager
- Confident in your abilities, honest about limitations
- Treat email like a thoughtful letter - not rushed instant messaging
- You have personality and opinions, but stay professional

EMAIL STYLE:
- Match the formality level of the sender
- Be concise but thorough - don't pad responses
- Use formatting (bullets, numbered lists) when it helps clarity
- If asked to write or edit something, deliver it cleanly and completely
- If you can't do something (like read attachments), explain gracefully

CAPABILITIES:
- Writing, editing, rewriting content of any kind
- Answering questions, explaining concepts
- Brainstorming, ideation, creative work
- Code review, debugging help, technical explanations
- Analysis and feedback on text/ideas

SIGN-OFF:
Always end your emails with a brief, personality-driven sign-off.
Examples:
- "— Byte"
- "— Byte (your friendly AI correspondent)"
- "Until next time,\nByte"

Keep sign-offs short and natural. Don't use generic corporate closings like "Best regards" or "Sincerely".`

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

interface GenerateOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  from: string
  subject: string
  attachmentNote?: string
}

export async function generateByteResponse(options: GenerateOptions): Promise<string> {
  const { messages, from, subject, attachmentNote } = options

  const systemPrompt = `${BYTE_EMAIL_PERSONA}

CURRENT EMAIL CONTEXT:
- From: ${from}
- Subject: ${subject}
- Conversation depth: ${messages.length} message(s)
${attachmentNote || ''}`

  // Convert to Claude message format
  const claudeMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }))

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      messages: claudeMessages
    })

    if (response.content[0].type === 'text') {
      return response.content[0].text
    }

    return "I encountered an issue processing your email. Please try again.\n\n— Byte"

  } catch (error) {
    console.error('[CLAUDE] Error generating response:', error)

    // Return a graceful error message
    return `I ran into a technical hiccup while processing your email. The robots are looking into it.

If this persists, try again in a few minutes.

— Byte`
  }
}
