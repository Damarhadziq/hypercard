import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { adminService } from '../services/admin.service.js';
import { fromNodeHeaders } from 'better-auth/node';

const router = Router();

/**
 * Custom hook: After successful sign-in, update lastLogin timestamp.
 * This is done as a separate endpoint the frontend can call after login.
 */
router.post('/touch-login', async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await adminService.touchLogin(session.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Touch login error:', error);
    res.status(500).json({ error: 'Failed to update login timestamp' });
  }
});

/**
 * Better Auth wildcard handler.
 * Handles all /api/auth/* routes: sign-up, sign-in, sign-out, session, etc.
 */
router.all('/*splat', toNodeHandler(auth));

export default router;
