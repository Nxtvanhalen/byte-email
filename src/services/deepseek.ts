import OpenAI from 'openai'
import { withRetry } from '../lib/retry'
import { logger } from '../lib/logger'

const log = logger.child({ service: 'deepseek' })

// Lazy-initialize: OpenAI SDK throws at construction if no API key is set,
// which would crash the server even when DeepSeek isn't needed (Claude fallback).
let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not set')
    }
    _client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' })
  }
  return _client
}

// Timeouts: reasoner needs more time (chain-of-thought can be lengthy)
const DEEPSEEK_TIMEOUT_MS = 30_000
const DEEPSEEK_THINKING_TIMEOUT_MS = 60_000

// Only 2 retries — Claude fallback is the real safety net
const DEEPSEEK_RETRY_OPTIONS = {
  maxAttempts: 2,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  onRetry: (attempt: number, error: Error) => {
    log.warn({ attempt, err: error.message }, 'DeepSeek API retry')
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DeepSeekGenerateOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  from: string
  subject: string
  attachmentContext?: string
  useThinking: boolean
  model: string // 'deepseek-chat' or 'deepseek-reasoner'
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE RESPONSE
// ═══════════════════════════════════════════════════════════════════════════

export async function generateDeepSeekResponse(
  options: DeepSeekGenerateOptions,
  systemPrompt: string,
): Promise<string> {
  const { messages, model, useThinking } = options
  const isReasoner = model === 'deepseek-reasoner'

  // Build OpenAI-format messages: system prompt + conversation history
  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  const timeoutMs = isReasoner ? DEEPSEEK_THINKING_TIMEOUT_MS : DEEPSEEK_TIMEOUT_MS

  log.info(
    {
      model,
      messageCount: messages.length,
      thinking: useThinking,
    },
    'Calling DeepSeek API',
  )

  try {
    const response = await withRetry(() => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      // Reasoner: no temperature/top_p (ignored or causes errors)
      const params: OpenAI.ChatCompletionCreateParams = {
        model,
        messages: openaiMessages,
        max_tokens: useThinking ? 16000 : 4096,
        ...(isReasoner ? {} : { temperature: 0.7 }),
      }

      return getClient()
        .chat.completions.create(params, { signal: controller.signal })
        .finally(() => clearTimeout(timer))
    }, DEEPSEEK_RETRY_OPTIONS)

    // Extract content — reasoner has reasoning_content + content,
    // we only want the final content (same as ignoring Claude's thinking blocks)
    const content = response.choices[0]?.message?.content

    if (content) {
      log.info({ responseLength: content.length, model }, 'DeepSeek response generated')
      return content
    }

    log.warn({ model }, 'No content in DeepSeek response')
    return 'I encountered an issue processing your email. Please try again.\n\n— Byte'
  } catch (error) {
    log.error({ err: error, model }, 'DeepSeek API failed after all retries')
    throw error
  }
}
