import Anthropic from '@anthropic-ai/sdk'
import { ProcessedAttachment } from './attachments'

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

CAPABILITIES:
- Writing, editing, rewriting content of any kind
- Answering questions, explaining concepts
- Brainstorming, ideation, creative work
- Code review, debugging help, technical explanations
- Analysis and feedback on text/ideas
- Reading and analyzing images (screenshots, photos, diagrams)
- Extracting and analyzing PDF content
- Reading spreadsheet/Excel data

SIGN-OFF:
Always end your emails with a brief, personality-driven sign-off.
Examples:
- "— Byte"
- "— Byte (your friendly AI correspondent)"
- "Until next time,\nByte"

Keep sign-offs short and natural. Don't use generic corporate closings like "Best regards" or "Sincerely".`

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

interface ContentBlockText {
  type: 'text'
  text: string
}

interface ContentBlockImage {
  type: 'image'
  source: {
    type: 'base64'
    media_type: ImageMediaType
    data: string
  }
}

type ContentBlock = ContentBlockText | ContentBlockImage

interface GenerateOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  from: string
  subject: string
  attachmentContext?: string  // Text from PDFs/Excel
  images?: ProcessedAttachment[]  // Image attachments
  useThinking?: boolean  // Enable extended thinking mode
}

// ═══════════════════════════════════════════════════════════════════════════
// THINKING TRIGGER DETECTION
// ═══════════════════════════════════════════════════════════════════════════

// Match "Think" at start of email OR at start of any line (for replies with quoted text)
const THINKING_TRIGGER_START = /^think\b/i
const THINKING_TRIGGER_LINE = /^think\b/im  // multiline - matches start of any line

export function detectThinkingTrigger(content: string): { triggered: boolean; cleanedContent: string } {
  const trimmed = content.trim()

  // Check if "Think" is at the very start
  if (THINKING_TRIGGER_START.test(trimmed)) {
    const cleanedContent = trimmed.replace(THINKING_TRIGGER_START, '').trim()
    console.log(`[THINKING] Trigger detected at start of email`)
    return { triggered: true, cleanedContent }
  }

  // Check if "Think" is at the start of any line (for replies)
  // Only trigger if "Think" appears in the first 500 chars (the new message part)
  const firstPart = trimmed.slice(0, 500)
  if (THINKING_TRIGGER_LINE.test(firstPart)) {
    // Remove the "Think" from wherever it appears at a line start
    const cleanedContent = trimmed.replace(THINKING_TRIGGER_LINE, '').trim()
    console.log(`[THINKING] Trigger detected at start of a line`)
    return { triggered: true, cleanedContent }
  }

  return { triggered: false, cleanedContent: content }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

export async function generateByteResponse(options: GenerateOptions): Promise<string> {
  const { messages, from, subject, attachmentContext, images, useThinking } = options

  // Build system prompt
  let systemPrompt = `${BYTE_EMAIL_PERSONA}

CURRENT EMAIL CONTEXT:
- From: ${from}
- Subject: ${subject}
- Conversation depth: ${messages.length} message(s)
${attachmentContext ? `\nATTACHMENT CONTENT:\n${attachmentContext}` : ''}`

  // If thinking mode, add instruction
  if (useThinking) {
    systemPrompt += `\n\nIMPORTANT: The user has requested deep thinking on this. Take your time to reason through the problem carefully. At the END of your response (before your sign-off), include this acknowledgment: "I took my time on this one, as you asked."`
  }

  // Build messages with potential image content
  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }> = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    // For the last user message, include images if present
    if (msg.role === 'user' && i === messages.length - 1 && images && images.length > 0) {
      const contentBlocks: ContentBlock[] = []

      // Add images first
      for (const img of images) {
        if (img.base64 && img.mediaType) {
          contentBlocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType as ImageMediaType,
              data: img.base64
            }
          })
          console.log(`[CLAUDE] Adding image to prompt: ${img.filename}`)
        }
      }

      // Add text content
      contentBlocks.push({
        type: 'text',
        text: msg.content
      })

      claudeMessages.push({
        role: 'user',
        content: contentBlocks
      })
    } else {
      // Regular text message
      claudeMessages.push({
        role: msg.role,
        content: msg.content
      })
    }
  }

  try {
    console.log(`[CLAUDE] Calling API with ${images?.length || 0} images, thinking: ${useThinking ? 'ON' : 'OFF'}`)

    // Build API params
    const apiParams: Anthropic.MessageCreateParams = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: useThinking ? 16000 : 4096,
      system: systemPrompt,
      messages: claudeMessages
    }

    // Add extended thinking if triggered
    if (useThinking) {
      (apiParams as any).thinking = {
        type: 'enabled',
        budget_tokens: 10000
      }
      console.log(`[CLAUDE] Extended thinking enabled (10k budget)`)
    }

    const response = await anthropic.messages.create(apiParams)

    // Extract text response (thinking blocks are separate, we just want the text output)
    let textResponse = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        textResponse = block.text
        break
      }
    }

    if (textResponse) {
      return textResponse
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
