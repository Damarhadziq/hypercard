import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { productService } from '../services/product.service.js';
import { storageService } from '../services/storage.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth to all product routes
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().optional(),
  condition: z.string().optional(),
  setName: z.string().optional(),
  rarity: z.string().optional(),
  language: z.string().optional(),
  cardNumber: z.string().optional(),
  finish: z.string().optional(),
  buyPrice: z.coerce.number().int().min(0),
  sellPrice: z.coerce.number().int().min(0),
  stock: z.coerce.number().int().min(0).optional(),
  image: z.string().optional(),
  notes: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial();

/**
 * GET /api/products
 * List all products with optional search and pagination.
 */
router.get('/', async (req, res) => {
  const search = req.query.search as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await productService.getAll(search, page, limit);
  res.json(result);
});

/**
 * GET /api/products/:id
 * Get a single product by ID.
 */
router.get('/:id', async (req, res) => {
  const product = await productService.getById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(product);
});

/**
 * POST /api/products
 * Create a new product.
 */
router.post('/', async (req, res) => {
  const parsed = createProductSchema.parse(req.body);
  const product = await productService.create(parsed);
  res.status(201).json(product);
});

/**
 * PATCH /api/products/:id
 * Update an existing product.
 */
router.patch('/:id', async (req, res) => {
  const parsed = updateProductSchema.parse(req.body);
  const product = await productService.update(req.params.id, parsed);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(product);
});

/**
 * DELETE /api/products/:id
 * Delete a product.
 */
router.delete('/:id', async (req, res) => {
  const deleted = await productService.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ success: true });
});

/**
 * POST /api/products/:id/image
 * Upload a product image.
 */
router.post('/:id/image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }

  const productId = String(req.params.id);
  const existingProduct = await productService.getById(productId);
  if (!existingProduct) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const uploaded = await storageService.uploadProductImage(productId, req.file);

  try {
    const product = await productService.updateImage(productId, uploaded.publicUrl);
    res.json(product);
  } catch (error) {
    await storageService.removeObject(uploaded.objectPath).catch(() => undefined);
    throw error;
  }
});

export default router;
