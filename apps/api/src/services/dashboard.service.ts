import { sql, eq, gte, and, desc, asc, ilike, lte, lt, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  transactions,
  transactionItems,
  customers,
  products,
} from '../db/schema.js';

export const dashboardService = {
  /**
   * Get summary metrics for the dashboard:
   * - Total revenue (omzet) for current month
   * - Completed transaction count
   * - Total products sold
   * - Unpaid total amount and count
   */
  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total omzet (Lunas transactions this month)
    const [omzetResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactions.total}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, 'Lunas'),
          gte(transactions.date, startOfMonth)
        )
      );

    // Products sold this month
    const [soldResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactionItems.quantity}), 0)::int`,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(gte(transactions.date, startOfMonth));

    // Unpaid invoices
    const [unpaidResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${transactions.total}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(eq(transactions.status, 'Belum Dibayar'));

    return {
      omzet: omzetResult?.total ?? 0,
      transactionCount: omzetResult?.count ?? 0,
      productsSold: soldResult?.total ?? 0,
      unpaidTotal: unpaidResult?.total ?? 0,
      unpaidCount: unpaidResult?.count ?? 0,
    };
  },

  /**
   * Get daily revenue data for the chart.
   * Returns aggregated daily totals for the current month.
   */
  async getChartData(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`to_char(${transactions.date}, 'DD Mon')`,
        total: sql<number>`coalesce(sum(${transactions.total}), 0)::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, 'Lunas'),
          gte(transactions.date, startDate)
        )
      )
      .groupBy(sql`to_char(${transactions.date}, 'DD Mon'), date(${transactions.date})`)
      .orderBy(sql`date(${transactions.date})`);

    return result.map((row) => ({
      name: row.date,
      total: row.total,
    }));
  },

  /**
   * Get the most recent transactions with customer names.
   */
  async getRecentTransactions(limit = 5) {
    const result = await db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        customerId: transactions.customerId,
        customerName: customers.name,
        total: transactions.total,
        status: transactions.status,
        date: transactions.date,
      })
      .from(transactions)
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .orderBy(desc(transactions.date))
      .limit(limit);

    return result;
  },

  async getReportItems(params: {
    mode?: 'all' | 'month' | 'year';
    month?: number;
    year?: number;
    search?: string;
    sortKey?: 'date' | 'itemName' | 'quantity' | 'buyPrice' | 'sellPrice' | 'buyerName';
    sortDirection?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const sortDirection = params.sortDirection === 'asc' ? 'asc' : 'desc';
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const conditions: SQL[] = [
      eq(transactions.status, 'Lunas'),
      lte(transactions.date, todayEnd),
    ];

    if (params.mode === 'month' && params.year !== undefined && params.month !== undefined) {
      conditions.push(gte(transactions.date, new Date(params.year, params.month, 1)));
      conditions.push(lt(transactions.date, new Date(params.year, params.month + 1, 1)));
    } else if (params.mode === 'year' && params.year !== undefined) {
      conditions.push(gte(transactions.date, new Date(params.year, 0, 1)));
      conditions.push(lt(transactions.date, new Date(params.year + 1, 0, 1)));
    }

    if (params.search) {
      conditions.push(or(
        ilike(products.name, `%${params.search}%`),
        ilike(customers.name, `%${params.search}%`)
      )!);
    }

    const sortColumns = {
      date: transactions.date,
      itemName: products.name,
      quantity: transactionItems.quantity,
      buyPrice: products.buyPrice,
      sellPrice: transactionItems.price,
      buyerName: customers.name,
    };
    const sortColumn = sortColumns[params.sortKey ?? 'date'] ?? transactions.date;
    const orderBy = sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn);
    const whereCondition = and(...conditions);

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: transactionItems.id,
          transactionId: transactions.id,
          date: transactions.date,
          itemName: products.name,
          quantity: transactionItems.quantity,
          buyPrice: products.buyPrice,
          sellPrice: transactionItems.price,
          buyerName: customers.name,
        })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(customers, eq(transactions.customerId, customers.id))
        .where(whereCondition)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
        .leftJoin(products, eq(transactionItems.productId, products.id))
        .leftJoin(customers, eq(transactions.customerId, customers.id))
        .where(whereCondition),
    ]);

    return {
      data: data.map((row) => ({
        ...row,
        itemName: row.itemName ?? 'Produk',
        buyPrice: row.buyPrice ?? 0,
        buyerName: row.buyerName ?? '-',
      })),
      pagination: {
        page,
        limit,
        total: countResult[0]?.count ?? 0,
      },
    };
  },

  async getReportSummary(params: {
    mode?: 'all' | 'month' | 'year';
    month?: number;
    year?: number;
  }) {
    const mode = params.mode ?? 'all';
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const getPeriodBounds = (previous = false) => {
      if (mode === 'month' && params.month !== undefined && params.year !== undefined) {
        const targetMonth = previous ? params.month - 1 : params.month;
        return {
          start: new Date(params.year, targetMonth, 1),
          end: new Date(params.year, targetMonth + 1, 1),
        };
      }
      if (mode === 'year' && params.year !== undefined) {
        const targetYear = previous ? params.year - 1 : params.year;
        return {
          start: new Date(targetYear, 0, 1),
          end: new Date(targetYear + 1, 0, 1),
        };
      }
      return null;
    };

    const getConditions = (previous = false) => {
      const conditions: SQL[] = [
        eq(transactions.status, 'Lunas'),
        lte(transactions.date, todayEnd),
      ];
      const bounds = getPeriodBounds(previous);
      if (bounds) {
        conditions.push(gte(transactions.date, bounds.start));
        conditions.push(lt(transactions.date, bounds.end));
      }
      return and(...conditions);
    };

    const loadPeriod = async (previous = false) => {
      if (previous && mode === 'all') {
        return {
          itemRows: [] as {
            date: Date;
            quantity: number;
            sellPrice: number;
            buyPrice: number | null;
          }[],
          transactionRows: [] as {
            customerId: string;
            customerName: string | null;
            total: number;
            shippingCost: number;
          }[],
        };
      }

      const conditions = getConditions(previous);
      const [itemRows, transactionRows] = await Promise.all([
        db
          .select({
            date: transactions.date,
            quantity: transactionItems.quantity,
            sellPrice: transactionItems.price,
            buyPrice: products.buyPrice,
          })
          .from(transactionItems)
          .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
          .leftJoin(products, eq(transactionItems.productId, products.id))
          .where(conditions),
        db
          .select({
            customerId: transactions.customerId,
            customerName: customers.name,
            total: transactions.total,
            shippingCost: transactions.shippingCost,
          })
          .from(transactions)
          .leftJoin(customers, eq(transactions.customerId, customers.id))
          .where(conditions),
      ]);

      return { itemRows, transactionRows };
    };

    const [current, previous, yearRows] = await Promise.all([
      loadPeriod(),
      loadPeriod(true),
      db
        .select({
          year: sql<number>`extract(year from ${transactions.date})::int`,
        })
        .from(transactions)
        .groupBy(sql`extract(year from ${transactions.date})`)
        .orderBy(desc(sql`extract(year from ${transactions.date})`)),
    ]);

    const summarize = (periodData: Awaited<ReturnType<typeof loadPeriod>>) => {
      const totalSold = periodData.itemRows.reduce(
        (total, row) => total + row.sellPrice * row.quantity,
        0,
      );
      const totalItems = periodData.itemRows.reduce(
        (total, row) => total + row.quantity,
        0,
      );
      const capitalCost = periodData.itemRows.reduce(
        (total, row) => total + (row.buyPrice ?? 0) * row.quantity,
        0,
      );
      const sellerShippingCost = periodData.transactionRows.reduce(
        (total, row) => total + row.shippingCost,
        0,
      );
      const totalProfit = totalSold - capitalCost;
      const totalCost = capitalCost + sellerShippingCost;
      const netProfit = totalSold - totalCost;

      return {
        totalSold,
        totalItems,
        totalProfit,
        transactionCount: periodData.transactionRows.length,
        customerCount: new Set(periodData.transactionRows.map((row) => row.customerId)).size,
        costBreakdown: {
          revenue: totalSold,
          capitalCost,
          sellerShippingCost,
          totalCost,
          netProfit,
          netMargin: totalSold > 0 ? (netProfit / totalSold) * 100 : 0,
        },
      };
    };

    const chartGroups = new Map<number, { sold: number; profit: number }>();
    for (const row of current.itemRows) {
      const date = new Date(row.date);
      const bucket = mode === 'month'
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
        : new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      const currentBucket = chartGroups.get(bucket) ?? { sold: 0, profit: 0 };
      currentBucket.sold += row.sellPrice * row.quantity;
      currentBucket.profit += (row.sellPrice - (row.buyPrice ?? 0)) * row.quantity;
      chartGroups.set(bucket, currentBucket);
    }

    const customerGroups = new Map<string, {
      id: string;
      name: string;
      spend: number;
      orders: number;
    }>();
    for (const row of current.transactionRows) {
      const customer = customerGroups.get(row.customerId) ?? {
        id: row.customerId,
        name: row.customerName ?? 'Pembeli',
        spend: 0,
        orders: 0,
      };
      customer.spend += row.total;
      customer.orders += 1;
      customerGroups.set(row.customerId, customer);
    }

    const currentSummary = summarize(current);
    const previousSummary = summarize(previous);

    return {
      current: currentSummary,
      previous: previousSummary,
      hasCurrentData: current.transactionRows.length > 0,
      hasPreviousData: previous.transactionRows.length > 0,
      chart: Array.from(chartGroups.entries())
        .sort(([left], [right]) => left - right)
        .map(([date, values]) => ({ date, ...values })),
      topSpend: Array.from(customerGroups.values())
        .sort((left, right) => right.spend - left.spend || right.orders - left.orders)
        .slice(0, 5),
      availableYears: Array.from(new Set([
        now.getFullYear(),
        ...yearRows.map((row) => row.year),
      ])).sort((left, right) => right - left),
    };
  },
};
