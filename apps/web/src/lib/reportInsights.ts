import type { Transaction } from '../store/useStore';

export interface CostBreakdown {
  revenue: number;
  capitalCost: number;
  sellerShippingCost: number;
  totalCost: number;
  netProfit: number;
  netMargin: number;
}

export type InsightStatus = 'Positif' | 'Perlu Dipantau' | 'Info';

export interface SalesInsight {
  key: 'empty' | 'revenue' | 'profit' | 'margin' | 'cost';
  title: string;
  description: string;
  status: InsightStatus;
}

type FlexibleItem = Transaction['items'][number] & {
  modalPerPcs?: number;
  modal?: number;
  costPrice?: number;
  capitalPrice?: number;
  hargaJualPerPcs?: number;
  hargaJual?: number;
  sellingPrice?: number;
  soldPrice?: number;
  qty?: number;
  jumlah?: number;
};

type FlexibleTransaction = Transaction & {
  ongkirSeller?: number;
  sellerShippingCost?: number;
  ongkirDitanggungSeller?: number;
};

export function safeNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatRupiah(value: number): string {
  return `Rp ${safeNumber(value).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

export function formatPercentage(value: number): string {
  return `${safeNumber(value).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

function firstNumber(...values: unknown[]): number {
  const value = values.find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');
  return safeNumber(value);
}

export function calculateCostBreakdown(transactions: Transaction[]): CostBreakdown {
  let revenue = 0;
  let capitalCost = 0;
  let sellerShippingCost = 0;

  for (const transaction of transactions as FlexibleTransaction[]) {
    sellerShippingCost += firstNumber(
      transaction.ongkirSeller,
      transaction.sellerShippingCost,
      transaction.ongkirDitanggungSeller,
      transaction.shippingCost,
    );

    for (const item of transaction.items as FlexibleItem[]) {
      const quantity = firstNumber(item.quantity, item.qty, item.jumlah);
      const sellPrice = firstNumber(
        item.price,
        item.hargaJualPerPcs,
        item.hargaJual,
        item.sellingPrice,
        item.soldPrice,
      );
      const buyPrice = firstNumber(
        item.buyPrice,
        item.modalPerPcs,
        item.modal,
        item.costPrice,
        item.capitalPrice,
      );

      revenue += sellPrice * quantity;
      capitalCost += buyPrice * quantity;
    }
  }

  const totalCost = capitalCost + sellerShippingCost;
  const netProfit = revenue - totalCost;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    revenue: safeNumber(revenue),
    capitalCost: safeNumber(capitalCost),
    sellerShippingCost: safeNumber(sellerShippingCost),
    totalCost: safeNumber(totalCost),
    netProfit: safeNumber(netProfit),
    netMargin: safeNumber(netMargin),
  };
}

export function calculatePercentageChange(current: number, previous: number): number | null {
  const safeCurrent = safeNumber(current);
  const safePrevious = safeNumber(previous);
  if (safePrevious === 0) return null;
  return ((safeCurrent - safePrevious) / Math.abs(safePrevious)) * 100;
}

function createComparisonInsight(
  key: 'revenue' | 'profit',
  title: string,
  label: string,
  current: number,
  previous: number,
  hasPreviousData: boolean,
): SalesInsight {
  if (!hasPreviousData) {
    return {
      key,
      title,
      description: key === 'profit'
        ? 'Belum ada data profit bulan sebelumnya untuk dibandingkan.'
        : 'Belum ada data bulan sebelumnya untuk dibandingkan.',
      status: 'Info',
    };
  }

  const change = calculatePercentageChange(current, previous);
  if (change === null) {
    return {
      key,
      title,
      description: `${label} relatif stabil dibanding bulan sebelumnya.`,
      status: 'Info',
    };
  }

  if (Math.abs(change) < 0.05) {
    return {
      key,
      title,
      description: `${label} relatif stabil dibanding bulan sebelumnya.`,
      status: 'Info',
    };
  }

  const direction = change > 0 ? 'naik' : 'turun';
  return {
    key,
    title,
    description: `${label} ${direction} ${formatPercentage(Math.abs(change))} dibanding bulan sebelumnya.`,
    status: change > 0 ? 'Positif' : 'Perlu Dipantau',
  };
}

export function generateSalesInsights(
  current: CostBreakdown,
  previous: CostBreakdown,
  hasCurrentData: boolean,
  hasPreviousData: boolean,
): SalesInsight[] {
  if (!hasCurrentData) {
    return [{
      key: 'empty',
      title: 'Belum Ada Transaksi',
      description: 'Belum ada transaksi pada periode ini. Insight akan muncul setelah ada data penjualan.',
      status: 'Info',
    }];
  }

  const insights: SalesInsight[] = [
    createComparisonInsight('revenue', 'Omzet Bulanan', 'Omzet', current.revenue, previous.revenue, hasPreviousData),
    createComparisonInsight('profit', 'Profit Bersih', 'Profit bersih', current.netProfit, previous.netProfit, hasPreviousData),
  ];

  if (current.revenue <= 0) {
    insights.push({
      key: 'margin',
      title: 'Margin Bersih',
      description: 'Belum ada omzet untuk menghitung margin bulan ini.',
      status: 'Info',
    });
  } else if (current.netMargin >= 30) {
    insights.push({
      key: 'margin',
      title: 'Margin Bersih',
      description: `Margin bersih bulan ini cukup sehat di angka ${formatPercentage(current.netMargin)}.`,
      status: 'Positif',
    });
  } else if (current.netMargin >= 15) {
    insights.push({
      key: 'margin',
      title: 'Margin Bersih',
      description: 'Margin bersih masih cukup, namun ongkir seller tetap perlu dipantau.',
      status: 'Perlu Dipantau',
    });
  } else {
    insights.push({
      key: 'margin',
      title: 'Margin Bersih',
      description: 'Margin bersih cukup tipis. Coba cek kembali modal barang atau ongkir yang ditanggung seller.',
      status: 'Perlu Dipantau',
    });
  }

  const largestCost = Math.max(current.capitalCost, current.sellerShippingCost);
  if (largestCost <= 0) {
    insights.push({
      key: 'cost',
      title: 'Biaya Terbesar',
      description: 'Belum ada komponen biaya yang tercatat.',
      status: 'Info',
    });
  } else {
    const costName = current.capitalCost >= current.sellerShippingCost ? 'Modal Barang' : 'Ongkir Seller';
    insights.push({
      key: 'cost',
      title: 'Biaya Terbesar',
      description: `Komponen biaya terbesar bulan ini adalah ${costName} sebesar ${formatRupiah(largestCost)}.`,
      status: 'Info',
    });
  }

  return insights;
}
