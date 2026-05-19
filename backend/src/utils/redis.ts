import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    redis.on("error", () => {});
  }
  return redis;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await getRedis().get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl = 300) {
  try {
    await getRedis().setex(key, ttl, JSON.stringify(value));
  } catch {}
}

export async function cacheDel(key: string) {
  try {
    await getRedis().del(key);
  } catch {}
}

export async function cacheDelPattern(pattern: string) {
  try {
    const keys = await getRedis().keys(pattern);
    if (keys.length) await getRedis().del(...keys);
  } catch {}
}
