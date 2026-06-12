import { Router } from 'express';
import { z } from 'zod';
import { customerService } from '../services/customer.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth to all customer routes
router.use(requireAuth);

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  history: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

/**
 * GET /api/customers
 * List all customers with optional search and pagination.
 */
router.get('/', async (req, res) => {
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await customerService.getAll(search, page, limit);
  res.json(result);
});

/**
 * GET /api/customers/:id
 * Get a single customer by ID.
 */
router.get('/:id', async (req, res) => {
  const customer = await customerService.getById(req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json(customer);
});

/**
 * POST /api/customers
 * Create a new customer.
 */
router.post('/', async (req, res) => {
  const parsed = createCustomerSchema.parse(req.body);
  const customer = await customerService.create(parsed);
  res.status(201).json(customer);
});

/**
 * PATCH /api/customers/:id
 * Update an existing customer.
 */
router.patch('/:id', async (req, res) => {
  const parsed = updateCustomerSchema.parse(req.body);
  const customer = await customerService.update(req.params.id, parsed);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json(customer);
});

/**
 * DELETE /api/customers/:id
 * Delete a customer.
 */
router.delete('/:id', async (req, res) => {
  const deleted = await customerService.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
