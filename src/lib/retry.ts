/**
 * Retry utility with exponential backoff
 */
import { logger } from './logger'

const log = logger.child({ module: 'retry' })

interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff + jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
  const jitter = Math.random() * 0.3 * exponentialDelay // 0-30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options }
  const { onRetry } = options

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break
      }

      const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs)
      log.info({ attempt, maxAttempts, delayMs: Math.round(delay) }, 'Attempt failed, retrying')

      if (onRetry) {
        onRetry(attempt, lastError)
      }

      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Determine if an error is worth retrying
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Rate limits - always retry
    if (message.includes('rate') || message.includes('429')) {
      return true
    }

    // Server errors - retry
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return true
    }

    // Network errors and timeouts - retry
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('abort') ||
      error.name === 'AbortError'
    ) {
      return true
    }

    // Overloaded - retry
    if (message.includes('overloaded') || message.includes('capacity')) {
      return true
    }
  }

  // Check for HTTP status codes on error objects
  if (typeof error === 'object' && error !== null) {
    const statusCode = (error as any).status || (error as any).statusCode
    if (statusCode && [429, 500, 502, 503, 504].includes(statusCode)) {
      return true
    }
  }

  return false
}

/**
 * Create a retry wrapper with preset options
 */
export function createRetrier(options: RetryOptions) {
  return <T>(fn: () => Promise<T>) => withRetry(fn, options)
}
