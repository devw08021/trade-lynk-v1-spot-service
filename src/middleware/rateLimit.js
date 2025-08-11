import { env } from "../config/env";
import Redis from "ioredis";

const redis = new Redis(env.REDIS_URL || "redis://localhost:6379");

export function createRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyGenerator = (c) => {
      const ip =
        c.req.header("x-forwarded-for") ||
        c.req.header("x-real-ip") ||
        c.req.header("cf-connecting-ip") ||
        "unknown";
      const user = c.get("user");
      return user ? `${ip}:${user.userId}` : ip;
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = "Too many requests, please try again later.",
    statusCode = 429,
  } = options;

  return async function rateLimitMiddleware(c, next) {
    try {
      const key = keyGenerator(c);
      const now = Date.now();
      const windowStart = now - windowMs;

      const multi = redis.multi();
      multi.zremrangebyscore(`rate_limit:${key}`, 0, windowStart);
      multi.zadd(`rate_limit:${key}`, now, now.toString());
      multi.zcard(`rate_limit:${key}`);
      multi.expire(`rate_limit:${key}`, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const currentCount = results[2][1];

      c.header("X-RateLimit-Limit", max.toString());
      c.header(
        "X-RateLimit-Remaining",
        Math.max(0, max - currentCount).toString()
      );
      c.header("X-RateLimit-Reset", new Date(now + windowMs).toISOString());

      if (currentCount > max) {
        return c.json(
          {
            error: message,
            retryAfter: Math.ceil(windowMs / 1000),
          },
          statusCode
        );
      }

      await next();

      if (skipSuccessfulRequests && c.res.status < 400) {
        await redis.zrem(`rate_limit:${key}`, now.toString());
      }
      if (skipFailedRequests && c.res.status >= 400) {
        await redis.zrem(`rate_limit:${key}`, now.toString());
      }
    } catch (error) {
      console.error("Rate limiting error:", error);
      await next();
    }
  };
}

/**
 * IP-based rate limiting middleware
 */
export const ipRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (c) => {
    const ip =
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      c.req.header("cf-connecting-ip") ||
      "unknown";
    return `ip:${ip}`;
  },
});

/**
 * User-based rate limiting middleware
 */
export const userRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  keyGenerator: (c) => {
    const user = c.get("user");
    if (!user) {
      throw new Error(
        "User authentication required for user-based rate limiting"
      );
    }
    return `user:${user.userId}`;
  },
});

/**
 * Strict rate limiting for sensitive endpoints
 */
export const strictRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message:
    "Too many requests to sensitive endpoint. Please wait before trying again.",
  statusCode: 429,
});

/**
 * API key rate limiting middleware
 */
export const apiKeyRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  keyGenerator: (c) => {
    const apiKey = c.req.header("x-api-key");
    if (!apiKey) {
      throw new Error("API key required for API key-based rate limiting");
    }
    return `apikey:${apiKey}`;
  },
});

/**
 * Custom rate limiting with flexible configuration
 */
export function customRateLimit(config) {
  return createRateLimit(config);
}
