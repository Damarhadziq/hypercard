import type { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

/**
 * Validates the session via Better Auth.
 * Attaches `req.user` if authenticated, otherwise returns 401.
 * Also rejects inactive users.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized — session not found' });
      return;
    }

    const userRecord = session.user as {
      id: string;
      name: string;
      email: string;
      role?: string;
      status?: string;
    };

    if (userRecord.status === 'inactive') {
      res.status(403).json({ error: 'Account is inactive' });
      return;
    }

    req.user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role ?? 'admin',
      status: userRecord.status ?? 'active',
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Role guard — checks if the authenticated user has the required role.
 * Must be used after `requireAuth`.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden — requires role: ${roles.join(' or ')}` });
      return;
    }

    next();
  };
}
