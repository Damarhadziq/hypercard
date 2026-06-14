import { Router } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth to all dashboard routes
router.use(requireAuth);

/**
 * GET /api/dashboard/stats
 * Get summary metrics: omzet, transactions, products sold, unpaid.
 */
router.get('/stats', async (_req, res) => {
  const stats = await dashboardService.getStats();
  res.json(stats);
});

/**
 * GET /api/dashboard/chart
 * Get daily revenue data for the area chart.
 */
router.get('/chart', async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const chartData = await dashboardService.getChartData(days);
  res.json(chartData);
});

/**
 * GET /api/dashboard/recent
 * Get recent transactions for the dashboard sidebar.
 */
router.get('/recent', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const recent = await dashboardService.getRecentTransactions(limit);
  res.json(recent);
});

/**
 * GET /api/dashboard/report-items
 * Get paginated sales report rows for the report table.
 */
router.get('/report-items', async (req, res) => {
  const result = await dashboardService.getReportItems({
    mode: req.query.mode as 'all' | 'month' | 'year' | undefined,
    month: req.query.month !== undefined ? parseInt(req.query.month as string) : undefined,
    year: req.query.year !== undefined ? parseInt(req.query.year as string) : undefined,
    search: req.query.search as string | undefined,
    sortKey: req.query.sortKey as 'date' | 'itemName' | 'quantity' | 'buyPrice' | 'sellPrice' | 'buyerName' | undefined,
    sortDirection: req.query.sortDirection as 'asc' | 'desc' | undefined,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
  });
  res.json(result);
});

router.get('/report-summary', async (req, res) => {
  const result = await dashboardService.getReportSummary({
    mode: req.query.mode as 'all' | 'month' | 'year' | undefined,
    month: req.query.month !== undefined ? parseInt(req.query.month as string) : undefined,
    year: req.query.year !== undefined ? parseInt(req.query.year as string) : undefined,
  });
  res.json(result);
});

export default router;
