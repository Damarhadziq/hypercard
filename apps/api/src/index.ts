import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { rateLimit, securityHeaders } from './middleware/security.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import customerRoutes from './routes/customer.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import adminRoutes from './routes/admin.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

const corsOrigins = new Set(
  env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (env.CORS_ORIGIN.includes('localhost')) {
  corsOrigins.add('http://localhost:5173');
  corsOrigins.add('http://localhost:5174');
  corsOrigins.add('http://127.0.0.1:5173');
  corsOrigins.add('http://127.0.0.1:5174');
}

// ──────────────────────────────────────────────────────────
// Global middleware
// ──────────────────────────────────────────────────────────

app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: true,
}));

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// ──────────────────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/health/db', async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connection failed',
    });
  }
});

// ──────────────────────────────────────────────────────────
// API routes
// ──────────────────────────────────────────────────────────

// Better Auth — must be mounted before other routes
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }), authRoutes);

// Application routes
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admins', rateLimit({ windowMs: 15 * 60 * 1000, max: 120 }), adminRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ──────────────────────────────────────────────────────────
// Error handling
// ──────────────────────────────────────────────────────────

app.use(errorHandler);

// ──────────────────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────────────────

app.listen(env.PORT, () => {
  console.log(`\n🚀 Hypercard API running at http://localhost:${env.PORT}`);
  console.log(`   Health: http://localhost:${env.PORT}/api/health`);
  console.log(`   Auth:   http://localhost:${env.PORT}/api/auth`);
  console.log(`   CORS:   ${env.CORS_ORIGIN}\n`);
});

export default app;
