import { Redis } from '@upstash/redis'
import { logger } from '../lib/logger'

if (!process.env.UPSTASH_REDIS_URL || !process.env.UPSTASH_REDIS_TOKEN) {
  logger.warn('Missing UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN')
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_TOKEN || '',
})

// Test connection on startup
redis
  .ping()
  .then(() => {
    logger.info('Connected to Upstash Redis')
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to connect to Redis')
  })
