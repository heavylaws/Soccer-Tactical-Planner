// CoachTactics — in-memory fixed-window rate limiter (single-instance deployments).
// For multi-instance deployments, back this with Redis/Valkey; the interface stays the same.

import type { Request, Response, NextFunction } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface LimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

const MAX_TRACKED_KEYS = 50_000;

export class FixedWindowLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    readonly windowMs: number,
    readonly max: number
  ) {
    const sweeper = setInterval(() => this.sweep(), Math.min(windowMs, 60_000));
    sweeper.unref?.();
  }

  private sweep(now = Date.now()): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  private bucketFor(key: string, now: number): Bucket {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (this.buckets.size >= MAX_TRACKED_KEYS) {
        this.sweep(now);
        // Still saturated (key-spraying attack): drop the oldest entries.
        while (this.buckets.size >= MAX_TRACKED_KEYS) {
          const oldest = this.buckets.keys().next().value;
          if (oldest === undefined) break;
          this.buckets.delete(oldest);
        }
      }
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private result(bucket: Bucket, now: number): LimitResult {
    return {
      allowed: bucket.count <= this.max,
      remaining: Math.max(0, this.max - bucket.count),
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  /** Inspect without consuming. */
  peek(key: string): LimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      return { allowed: true, remaining: this.max, retryAfterSec: 0 };
    }
    return {
      allowed: bucket.count < this.max,
      remaining: Math.max(0, this.max - bucket.count),
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  /** Consume one unit. */
  hit(key: string): LimitResult {
    const now = Date.now();
    const bucket = this.bucketFor(key, now);
    bucket.count += 1;
    return this.result(bucket, now);
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

export function clientIp(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function rateLimit(
  limiter: FixedWindowLimiter,
  keyFn: (req: Request) => string,
  message: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = limiter.hit(keyFn(req));
    res.setHeader('RateLimit-Limit', String(limiter.max));
    res.setHeader('RateLimit-Remaining', String(r.remaining));
    if (!r.allowed) {
      res.setHeader('Retry-After', String(r.retryAfterSec));
      return res.status(429).json({ success: false, error: message, retryAfterSec: r.retryAfterSec });
    }
    next();
  };
}
