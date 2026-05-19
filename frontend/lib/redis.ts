import { Redis } from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("Redis connection error:", err.message);
      }
    });
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const value = await client.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number = 300
): Promise<void> {
  try {
    const client = getRedis();
    await client.setex(key, ttl, JSON.stringify(value));
  } catch {
    // silently fail — cache is optional
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(key);
  } catch {
    // silently fail
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const client = getRedis();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch {
    // silently fail
  }
}

export const CACHE_KEYS = {
  articles: (page: number, limit: number) => `articles:p${page}:l${limit}`,
  article: (slug: string) => `article:${slug}`,
  categories: () => "categories:all",
  trending: (limit: number) => `trending:${limit}`,
  breaking: () => "breaking:articles",
  featured: () => "featured:articles",
  search: (query: string, page: number) => `search:${query}:p${page}`,
  category: (slug: string, page: number) => `category:${slug}:p${page}`,
};

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 1800,
  DAY: 86400,
};
