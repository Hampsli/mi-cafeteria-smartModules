import env from '../config/env.js';
import { tooManyRequests } from '../utils/response.js';
import logger from '../utils/logger.js';

/**
 * In-memory rate limiter using a Map.
 * Tracks requests per IP within a sliding window.
 * No external dependencies -- ready to migrate to Redis/Upstash later.
 */

const store = new Map();

// Cleanup expired entries every window cycle
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > env.rateLimitWindowMs) {
      store.delete(key);
    }
  }
}, env.rateLimitWindowMs);

/**
 * Creates a rate limiter middleware with the given max requests.
 * @param {number} maxRequests - Max requests allowed per window
 * @returns {Function} Express middleware
 */
export function createRateLimiter(maxRequests) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}:${maxRequests}`;

    let entry = store.get(key);

    if (!entry || now - entry.windowStart > env.rateLimitWindowMs) {
      entry = { windowStart: now, count: 0 };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil((entry.windowStart + env.rateLimitWindowMs) / 1000);
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(resetTime));

    if (entry.count > maxRequests) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return tooManyRequests(res);
    }

    next();
  };
}

/** Default global rate limiter */
export const globalLimiter = createRateLimiter(env.rateLimitMaxRequests);

/** Higher limit for webhook endpoints */
export const webhookLimiter = createRateLimiter(env.rateLimitWebhookMax);

export default { createRateLimiter, globalLimiter, webhookLimiter };
