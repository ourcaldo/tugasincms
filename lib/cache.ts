import Redis from 'ioredis'

let redisClient: Redis | null = null

const CACHE_TTL = 3600

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.warn('Redis URL not configured, caching disabled')
    return null
  }

  if (!redisClient) {
    try {
      const useTLS = process.env.REDIS_URL.startsWith('rediss://')
      
      redisClient = new Redis(process.env.REDIS_URL, {
        connectTimeout: 10000,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('Redis connection failed after 3 retries')
            return null
          }
          return Math.min(times * 100, 2000)
        },
        ...(useTLS && {
          tls: {
            rejectUnauthorized: false,
          },
        }),
        enableReadyCheck: false,
        lazyConnect: true,
      })

      redisClient.on('connect', () => {
        console.log('✅ Connected to Redis cache')
      })

      redisClient.on('error', (error) => {
        console.error('Redis connection error:', error.message)
      })

      redisClient.on('close', () => {
        console.log('Redis connection closed')
      })
    } catch (error) {
      console.error('Failed to initialize Redis client:', error)
      return null
    }
  }

  return redisClient
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const cached = await client.get(key)
    if (cached) {
      console.log(`✅ Cache HIT: ${key}`)
      return JSON.parse(cached)
    }
    console.log(`❌ Cache MISS: ${key}`)
    return null
  } catch (error) {
    console.error(`Cache read error for key ${key}:`, error)
    return null
  }
}

export async function setCachedData(key: string, data: any, ttl: number = CACHE_TTL): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    if (ttl === 0) {
      await client.set(key, JSON.stringify(data))
      console.log(`💾 Cached: ${key} (No expiration)`)
    } else {
      await client.set(key, JSON.stringify(data), 'EX', ttl)
      console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`)
    }
    return true
  } catch (error) {
    console.error(`Cache write error for key ${key}:`, error)
    return false
  }
}

export async function deleteCachedData(pattern: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    if (pattern.includes('*')) {
      const keys = await client.keys(pattern)
      if (keys.length > 0) {
        await client.del(...keys)
        console.log(`🗑️  Deleted ${keys.length} cache keys matching: ${pattern}`)
      }
    } else {
      await client.del(pattern)
      console.log(`🗑️  Deleted cache key: ${pattern}`)
    }
    return true
  } catch (error) {
    console.error(`Cache delete error for pattern ${pattern}:`, error)
    return false
  }
}

export function closeCacheConnection(): void {
  if (redisClient) {
    redisClient.disconnect()
    redisClient = null
  }
}

export async function invalidateRedirectCache(postId: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    const redirectKey = `redirect:${postId}`
    await client.del(redirectKey)
    
    await deleteCachedData(`api:v1:posts:${postId}*`)
    await deleteCachedData(`api:public:posts:${postId}*`)
    
    return true
  } catch (error) {
    return false
  }
}
