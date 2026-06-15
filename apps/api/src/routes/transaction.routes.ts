import { Router } from 'express';
import { z } from 'zod';
import { transactionService } from '../services/transaction.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth to all transaction routes
router.use(requireAuth);

// Validation schemas
const createTransactionSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Invalid product ID'),
        quantity: z.number().int().positive(),
        price: z.number().int().min(0),
      })
    )
    .min(1, 'At least one item is required'),
  shippingCost: z.number().int().min(0).default(0),
  shippingCourier: z.string().optional(),
  shippingService: z.string().optional(),
  shippingDescription: z.string().optional(),
  shippingEtd: z.string().optional(),
  shippingWeight: z.number().int().positive().optional(),
  shippingOrigin: z.string().optional(),
  shippingDestination: z.string().optional(),
  paymentMethod: z.enum(['Mandiri', 'BCA', 'Lainnya']).default('Lainnya'),
  mandiriAccountNumber: z.string().optional(),
  mandiriAccountHolder: z.string().optional(),
  bcaAccountNumber: z.string().optional(),
  bcaAccountHolder: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['Lunas', 'Belum Dibayar']),
  paymentMethod: z.enum(['Mandiri', 'BCA', 'Lainnya']).optional(),
  mandiriAccountNumber: z.string().optional(),
  mandiriAccountHolder: z.string().optional(),
  bcaAccountNumber: z.string().optional(),
  bcaAccountHolder: z.string().optional(),
});

const listTransactionQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(50),
  sort: z.enum(['newest', 'oldest', 'price-asc', 'price-desc']).default('newest'),
  status: z.enum(['all', 'Lunas', 'Belum Dibayar']).default('all'),
});

/**
 * GET /api/transactions
 * List all transactions with optional search and pagination.
 */
router.get('/', async (req, res) => {
  const query = listTransactionQuerySchema.parse(req.query);
  const result = await transactionService.getAll(query);
  res.json(result);
});

/**
 * GET /api/transactions/next-invoice
 * Generate the next invoice number.
 */
router.get('/next-invoice', async (_req, res) => {
  const invoiceNumber = await transactionService.generateInvoiceNumber();
  res.json({ invoiceNumber });
});

/**
 * GET /api/transactions/:id
 * Get full transaction detail with items and customer info.
 */
router.get('/:id', async (req, res) => {
  const transaction = await transactionService.getById(req.params.id);
  if (!transaction) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json(transaction);
});

/**
 * POST /api/transactions
 * Create a new transaction with items (atomic — decrements stock).
 */
router.post('/', async (req, res) => {
  const parsed = createTransactionSchema.parse(req.body);
  const subtotal = parsed.items.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0,
  );
  const total = subtotal + parsed.shippingCost;

  // Auto-generate invoice number
  const invoiceNumber = await transactionService.generateInvoiceNumber();

  const transaction = await transactionService.create({
    ...parsed,
    subtotal,
    total,
    invoiceNumber,
  });

  res.status(201).json(transaction);
});

/**
 * PATCH /api/transactions/:id/status
 * Toggle transaction payment status.
 */
router.patch('/:id/status', async (req, res) => {
  const parsed = updateStatusSchema.parse(req.body);
  const transaction = await transactionService.updateStatus(req.params.id, parsed);
  if (!transaction) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json(transaction);
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction (cascades items).
 */
router.delete('/:id', async (req, res) => {
  const deleted = await transactionService.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
