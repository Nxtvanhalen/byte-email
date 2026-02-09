import { ProcessedAttachment } from './attachments'
import { logger } from '../lib/logger'

const log = logger.child({ service: 'router' })

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type LlmProvider = 'deepseek' | 'claude'

export interface RoutingDecision {
  provider: LlmProvider
  model: string
  reason: string
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE EMAIL TO APPROPRIATE LLM PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Decides which LLM provider handles an email based on:
 * - Whether real (non-logo) image/PDF attachments exist → Claude (vision)
 * - Whether THINK mode is requested → DeepSeek Reasoner (text) or Claude (attachments)
 * - Default → DeepSeek Chat (cheapest)
 *
 * Routing is PER-EMAIL, not per-thread. A thread can freely switch providers.
 * Excel attachments are text-extracted and don't require vision → DeepSeek eligible.
 */
export function routeEmail(options: {
  images: ProcessedAttachment[]
  pdfs: ProcessedAttachment[]
  useThinking: boolean
  deepseekAvailable?: boolean // Set false to force Claude (e.g. missing API key)
}): RoutingDecision {
  const { images, pdfs, useThinking, deepseekAvailable = !!process.env.DEEPSEEK_API_KEY } = options
  const hasVisionAttachments = images.length > 0 || pdfs.length > 0

  // If DeepSeek isn't configured, always use Claude
  if (!deepseekAvailable) {
    log.debug('DeepSeek not available, routing to Claude')
    return {
      provider: 'claude',
      model: 'claude-haiku-4-5-20251001',
      reason: 'deepseek_unavailable',
    }
  }

  // Images or PDFs require Claude's vision capabilities
  if (hasVisionAttachments) {
    log.info(
      { images: images.length, pdfs: pdfs.length, thinking: useThinking },
      'Routing to Claude (vision attachments)',
    )
    return {
      provider: 'claude',
      model: 'claude-haiku-4-5-20251001',
      reason: `vision_required (${images.length} images, ${pdfs.length} pdfs)`,
    }
  }

  // Text-only with THINK mode → DeepSeek Reasoner (unlimited thinking, no token budget)
  if (useThinking) {
    log.info('Routing to DeepSeek Reasoner (text-only + THINK)')
    return {
      provider: 'deepseek',
      model: 'deepseek-reasoner',
      reason: 'text_only_thinking',
    }
  }

  // Text-only, no thinking → DeepSeek Chat (cheapest option)
  log.info('Routing to DeepSeek Chat (text-only)')
  return {
    provider: 'deepseek',
    model: 'deepseek-chat',
    reason: 'text_only',
  }
}
