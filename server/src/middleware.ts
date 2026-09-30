import type { NextFunction, Request, Response } from "express";
import { config, isProd } from "./config.js";
import { HttpError } from "./lib/http.js";

/* ================================================================
   Sliding-window rate limiter (per IP + route bucket)
================================================================ */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// periodic sweep so the map never grows unbounded
let lastSweep = Date.now();
function sweep(): void {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  sweep();
  const key = `${req.ip ?? "unknown"}:${req.baseUrl || req.path}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + config.rateWindowMs });
    res.setHeader("X-RateLimit-Limit", String(config.rateMax));
    res.setHeader("X-RateLimit-Remaining", String(config.rateMax - 1));
    return next();
  }

  bucket.count++;
  const remaining = Math.max(0, config.rateMax - bucket.count);
  res.setHeader("X-RateLimit-Limit", String(config.rateMax));
  res.setHeader("X-RateLimit-Remaining", String(remaining));

  if (bucket.count > config.rateMax) {
    // only meaningful on the 429 itself
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    next(new HttpError(429, "Too many requests — slow down a little."));
    return;
  }
  next();
}

export const rateLimitStats = (): { activeBuckets: number; max: number; windowMs: number } => ({
  activeBuckets: buckets.size,
  max: config.rateMax,
  windowMs: config.rateWindowMs,
});

/* ================================================================
   Request logging
================================================================ */

export function logRequests(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - started;
    const level = res.statusCode >= 500 ? "ERR" : res.statusCode >= 400 ? "WARN" : "INFO";
    if (!isProd || level !== "INFO") {
      // eslint-disable-next-line no-console
      console.log(`[${level}] ${req.method} ${req.originalUrl} → ${res.statusCode} ${ms}ms`);
    }
  });
  next();
}

/* ================================================================
   Errors
================================================================ */

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error: "Not found",
    message: `No route matches ${req.method} ${req.path}`,
    hint: "Try GET /api/health for available endpoints.",
  });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const isHttp = err instanceof HttpError;
  const status = isHttp ? err.status : 500;
  const message = isHttp ? err.message : "Unexpected server error";

  if (!isHttp) {
    // eslint-disable-next-line no-console
    console.error("[FATAL]", err);
  }

  res.status(status).json({
    error: status >= 500 ? "server_error" : "bad_request",
    message,
    ...(isHttp && err.upstream ? { upstream: err.upstream } : {}),
    ...(config.env !== "production" && !isHttp && err instanceof Error ? { stack: err.stack } : {}),
  });
}
