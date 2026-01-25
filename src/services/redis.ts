import { Redis } from '@upstash/redis'

if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  console.warn('[REDIS] Warning: Missing UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN')
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || ''
})

// Test connection on startup
redis.ping().then(() => {
  console.log('[REDIS] ✓ Connected to Upstash Redis')
}).catch((err) => {
  console.error('[REDIS] ✗ Failed to connect:', err.message)
})
