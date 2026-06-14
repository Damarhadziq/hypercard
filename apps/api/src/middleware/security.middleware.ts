import type { NextFunction, Request, Response } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();
let requestCount = 0;

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  next();
}

export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    requestCount += 1;

    if (requestCount % 100 === 0) {
      for (const [key, record] of attempts) {
        if (record.resetAt <= now) attempts.delete(key);
      }
    }

    const key = `${req.ip}:${req.baseUrl}:${req.path}`;
    const current = attempts.get(key);
    const record = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current;

    record.count += 1;
    attempts.set(key, record);
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.max - record.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));

    if (record.count > options.max) {
      res.status(429).json({ error: 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.' });
      return;
    }
    next();
  };
}
