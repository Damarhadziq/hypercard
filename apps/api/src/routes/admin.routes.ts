import { Router } from 'express';
import { z } from 'zod';
import { adminService } from '../services/admin.service.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// All admin routes require superadmin role
router.use(requireAuth);
router.use(requireRole('superadmin'));

// Validation schemas
const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Nama admin minimal 2 karakter').max(80),
  email: z.string().trim().toLowerCase().email('Email tidak valid').max(160),
  password: z.string().min(8, 'Password minimal 8 karakter').max(128),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter').max(128),
});

/**
 * GET /api/admins
 * List all admin users with optional search and pagination.
 */
router.get('/', async (req, res) => {
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const result = await adminService.getAll(search, page, limit);
  res.json(result);
});

/**
 * POST /api/admins
 * Create a new admin user.
 */
router.post('/', async (req, res) => {
  const parsed = createAdminSchema.parse(req.body);
  try {
    const newAdmin = await adminService.create(parsed);
    res.status(201).json(newAdmin);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/already|exists|registered/i.test(message)) {
      res.status(409).json({ error: 'Email sudah terdaftar' });
      return;
    }
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Admin gagal dibuat. Silakan coba kembali.' });
  }
});

/**
 * PATCH /api/admins/:id/password
 * Change an admin's password.
 */
router.patch('/:id/password', async (req, res) => {
  const parsed = updatePasswordSchema.parse(req.body);
  try {
    const updated = await adminService.updatePassword(req.params.id, parsed.password);
    if (!updated) {
      res.status(404).json({ error: 'Akun admin atau credential password tidak ditemukan.' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Password gagal diperbarui. Silakan coba kembali.' });
  }
});

/**
 * PATCH /api/admins/:id/status
 * Toggle admin active/inactive status.
 */
router.patch('/:id/status', async (req, res) => {
  const admin = await adminService.toggleStatus(req.params.id);
  if (!admin) {
    res.status(404).json({ error: 'Admin not found' });
    return;
  }
  res.json(admin);
});

/**
 * DELETE /api/admins/:id
 * Delete an admin (cannot delete superadmin).
 */
router.delete('/:id', async (req, res) => {
  const deleted = await adminService.delete(req.params.id);
  if (!deleted) {
    res.status(400).json({ error: 'Cannot delete this admin (superadmin or not found)' });
    return;
  }
  res.json({ success: true });
});

export default router;
