import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Global error handler.
 * Catches thrown errors and returns structured JSON responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Standard errors
  if (err instanceof Error) {
    console.error(`[Error] ${err.message}`, err.stack);

    const status = (err as Error & { status?: number }).status ?? 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
    return;
  }

  console.error('[Error] Unknown error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
