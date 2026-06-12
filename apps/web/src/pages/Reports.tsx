import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@pokemon-finance/ui';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, ChevronDown, Download, FileText, Package, RotateCcw, Search, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { getTransactionCustomer, type Customer, type Product, type Transaction } from '../store/useStore';
import { useCustomers, useDashboardReportItems, useProducts, useTransactions } from '../hooks/useApiQueries';
import { filterTransactionsByPeriod, generateExcelReport, type ReportPeriod } from '../lib/generateReport';
import { useFeedback } from '../components/Feedback';
import Pagination from '../components/Pagination';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_CUSTOMERS: Customer[] = [];

function getPeriodDisplayLabel(period: ReportPeriod): string {
  if (period.mode === 'month' && period.month !== undefined && period.year !== undefined) {
    return `${MONTH_NAMES[period.month]} ${period.year}`;
  }
  if (period.mode === 'year' && period.year !== undefined) {
    return `Tahun ${period.year}`;
  }
  return 'Semua Periode';
}

function getAvailableYears(transactions: { date: string }[]): number[] {
  const years = new Set(transactions.map((transaction) => new Date(transaction.date).getFullYear()));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

function getPreviousPeriod(period: ReportPeriod): ReportPeriod {
  if (period.mode === 'month' && period.month !== undefined && period.year !== undefined) {
    if (period.month === 0) return { mode: 'month', month: 11, year: period.year - 1 };
    return { mode: 'month', month: period.month - 1, year: period.year };
  }
  if (period.mode === 'year' && period.year !== undefined) return { mode: 'year', year: period.year - 1 };
  return period;
}

function formatPercentDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

function formatProfitSignal(current: number, previous: number) {
  const sign = current >= 0 ? '+' : '-';
  if (previous === 0) return current === 0 ? '0%' : `${sign}100%`;
  const value = Math.abs(((current - previous) / previous) * 100);
  return `${sign}${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

function formatNumberDelta(current: number, previous: number) {
  const value = current - previous;
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('id-ID')}`;
}

function PeriodOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'text-finance-700 hover:bg-finance-50'
      }`}
    >
      {label}
    </button>
  );
}

function PeriodSelector({
  period,
  onChange,
  availableYears,
}: {
  period: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
  availableYears: number[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const now = new Date();

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="dropdown-trigger flex h-10 items-center gap-2 rounded-lg border border-finance-200 bg-white px-3 text-sm font-medium text-finance-700 hover:border-finance-300 hover:bg-finance-50"
      >
        <Calendar size={15} className="text-finance-400" />
        <span>{getPeriodDisplayLabel(period)}</span>
        <ChevronDown size={14} className={`text-finance-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-label="Tutup" />
          <div className="animate-dropdown-in absolute right-0 top-[calc(100%+6px)] z-50 w-72 overflow-hidden rounded-xl border border-finance-200 bg-white p-2 shadow-xl">
            <div className="mb-2 space-y-0.5">
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-finance-400">Cepat</p>
              <PeriodOption
                label="Bulan Ini"
                active={period.mode === 'month' && period.month === now.getMonth() && period.year === now.getFullYear()}
                onClick={() => {
                  onChange({ mode: 'month', month: now.getMonth(), year: now.getFullYear() });
                  setIsOpen(false);
                }}
              />
              <PeriodOption
                label="Tahun Ini"
                active={period.mode === 'year' && period.year === now.getFullYear()}
                onClick={() => {
                  onChange({ mode: 'year', year: now.getFullYear() });
                  setIsOpen(false);
                }}
              />
              <PeriodOption
                label="Semua Periode"
                active={period.mode === 'all'}
                onClick={() => {
                  onChange({ mode: 'all' });
                  setIsOpen(false);
                }}
              />
            </div>

            <div className="border-t border-finance-100 pt-2">
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-finance-400">Per Bulan</p>
              <div className="max-h-56 overflow-y-auto pr-1">
                {availableYears.map((year) => (
                  <div key={year} className="mb-1">
                    <p className="px-2 py-1 text-xs font-bold text-finance-700">{year}</p>
                    <div className="grid grid-cols-4 gap-1 px-1">
                      {MONTH_SHORT.map((month, index) => {
                        const active = period.mode === 'month' && period.month === index && period.year === year;
                        return (
                          <button
                            key={`${year}-${month}`}
                            type="button"
                            onClick={() => {
                              onChange({ mode: 'month', month: index, year });
                              setIsOpen(false);
                            }}
                            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                              active ? 'bg-primary text-white' : 'text-finance-600 hover:bg-finance-100 hover:text-finance-900'
                            }`}
                          >
                            {month}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-finance-100 pt-2">
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-finance-400">Per Tahun</p>
              <div className="grid grid-cols-3 gap-1 px-1">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      onChange({ mode: 'year', year });
                      setIsOpen(false);
                    }}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      period.mode === 'year' && period.year === year ? 'bg-primary text-white' : 'text-finance-600 hover:bg-finance-100 hover:text-finance-900'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  trend,
  isPositive = true,
  active = false,
  onClick,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const trendTone = isPositive ? 'text-green-600' : 'text-red-500';

  const content = (
    <Card className={`relative h-full overflow-hidden transition-all ${active ? 'border-accent/70 bg-accent/10 shadow-[inset_0_0_0_1px_rgba(214,180,93,0.22)]' : ''}`}>
      <div className="pointer-events-none absolute right-4 top-4 text-accent opacity-[0.12] [&_svg]:h-20 [&_svg]:w-20">
        {icon}
      </div>
      <CardContent className="relative z-10 flex h-full items-start justify-between p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-finance-500">{title}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="whitespace-nowrap text-2xl font-extrabold tracking-tight text-finance-950">{value}</p>
            {trend && (
              <p className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold ${trendTone}`}>
                {trend}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="interactive-click w-full text-left" aria-pressed={active}>
      {content}
    </button>
  );
}

interface ReportRow {
  id: string;
  transactionId: string;
  date: string;
  itemName: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyerName: string;
}

type SortKey = 'date' | 'itemName' | 'quantity' | 'buyPrice' | 'sellPrice' | 'buyerName';
type SortDirection = 'asc' | 'desc';

function SortableHead({
  label,
  sortKey,
  activeKey,
  direction,
  align = 'left',
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  align?: 'left' | 'right';
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <TableHead className={align === 'right' ? 'text-right' : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 transition-colors hover:text-finance-950 ${align === 'right' ? 'w-full justify-end' : ''}`}
      >
        {label}
        {active
          ? direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
          : <ArrowUpDown size={13} className="text-finance-400" />}
      </button>
    </TableHead>
  );
}

interface ChartPoint {
  label: string;
  tooltipLabel: string;
  date: number;
  sold: number;
  profit: number;
}

function getChartTicks(data: ChartPoint[], maxTicks = 15): string[] {
  if (data.length <= maxTicks) return data.map((point) => point.label);

  const lastIndex = data.length - 1;
  const indexes = new Set<number>();
  for (let index = 0; index < maxTicks; index += 1) {
    indexes.add(Math.round((index * lastIndex) / (maxTicks - 1)));
  }

  return Array.from(indexes)
    .sort((left, right) => left - right)
    .map((index) => data[index]!.label);
}

function ReportChart({
  title,
  subtitle,
  data,
  dataKey,
  gradientId,
  color,
}: {
  title: string;
  subtitle: string;
  data: ChartPoint[];
  dataKey: 'sold' | 'profit';
  gradientId: string;
  color: string;
}) {
  const xAxisTicks = getChartTicks(data);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4">
          <h2 className="font-bold text-finance-950">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-finance-500">{subtitle}</p>}
        </div>

        {data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-finance-500">
            Tidak ada data untuk divisualisasikan.
          </div>
        ) : (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={180}>
              <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(214,180,93,0.18)" />
                <XAxis
                  dataKey="label"
                  ticks={xAxisTicks}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8f9299' }}
                />
                <YAxis
                  width={66}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8f9299' }}
                  tickFormatter={(value: number) => `Rp ${(value / 1000).toLocaleString('id-ID')}k`}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(214,180,93,0.55)', strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const value = Number(payload[0]?.value ?? 0);
                    return (
                      <div className="rounded-lg border border-accent/35 bg-[#0c0c0f]/95 px-4 py-3 text-white shadow-xl">
                        <p className="text-xs text-finance-400">{payload[0]?.payload?.tooltipLabel ?? label}</p>
                        <p className="mt-1 text-sm font-bold">Rp {value.toLocaleString('id-ID')}</p>
                      </div>
                    );
                  }}
                />
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fill={`url(#${gradientId})`} isAnimationActive animationDuration={700} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const transactionsQuery = useTransactions({ limit: 1000 });
  const productsQuery = useProducts({ limit: 1000 });
  const customersQuery = useCustomers({ limit: 1000 });
  const transactions = transactionsQuery.data?.data ?? EMPTY_TRANSACTIONS;
  const products = productsQuery.data?.data ?? EMPTY_PRODUCTS;
  const customers = customersQuery.data?.data ?? EMPTY_CUSTOMERS;
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const navigate = useNavigate();
  const { notify } = useFeedback();

  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>({ mode: 'month', month: now.getMonth(), year: now.getFullYear() });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const availableYears = useMemo(() => getAvailableYears(transactions), [transactions]);
  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, period).filter((transaction) => transaction.status === 'Lunas'),
    [transactions, period],
  );
  const previousTransactions = useMemo(
    () => period.mode === 'all' ? [] : filterTransactionsByPeriod(transactions, getPreviousPeriod(period)).filter((transaction) => transaction.status === 'Lunas'),
    [period, transactions],
  );

  const reportRows = useMemo<ReportRow[]>(() => {
    const rows: ReportRow[] = [];
    for (const transaction of periodTransactions) {
      const customer = getTransactionCustomer(transaction, customers);
      for (const item of transaction.items) {
        const product = productMap.get(item.productId);
        rows.push({
          id: `${transaction.id}-${item.productId}-${rows.length}`,
          transactionId: transaction.id,
          date: transaction.date,
          itemName: item.productName ?? product?.name ?? 'Produk',
          quantity: item.quantity,
          buyPrice: item.buyPrice ?? product?.buyPrice ?? 0,
          sellPrice: item.price,
          buyerName: customer.name || transaction.customerName || '-',
        });
      }
    }
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customers, periodTransactions, productMap]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = reportRows.filter((row) => {
      const searchMatch = !query
        || row.itemName.toLowerCase().includes(query)
        || row.buyerName.toLowerCase().includes(query);
      return searchMatch;
    });

    return rows.sort((left, right) => {
      const leftValue = sortKey === 'date' ? new Date(left.date).getTime() : left[sortKey];
      const rightValue = sortKey === 'date' ? new Date(right.date).getTime() : right[sortKey];
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), 'id-ID');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [reportRows, searchQuery, sortDirection, sortKey]);

  const reportItemsQuery = useDashboardReportItems({
    mode: period.mode,
    month: period.month,
    year: period.year,
    search: searchQuery.trim() || undefined,
    sortKey,
    sortDirection,
    page,
    limit: pageSize,
  });
  const paginatedRows = reportItemsQuery.data?.data ?? [];
  const paginatedTotalItems = reportItemsQuery.data?.pagination.total ?? 0;
  const paginatedTotalPages = Math.max(1, Math.ceil(paginatedTotalItems / pageSize));

  useEffect(() => {
    if (page > paginatedTotalPages) setPage(paginatedTotalPages);
  }, [page, paginatedTotalPages]);

  const handlePeriodChange = (nextPeriod: ReportPeriod) => {
    setPeriod(nextPeriod);
    setPage(1);
  };

  const uniqueCustomers = new Set(periodTransactions.map((transaction) => transaction.customerId));
  const totalSold = filteredRows.reduce((total, row) => total + (row.sellPrice * row.quantity), 0);
  const totalItems = filteredRows.reduce((total, row) => total + row.quantity, 0);
  const totalProfit = filteredRows.reduce((total, row) => total + ((row.sellPrice - row.buyPrice) * row.quantity), 0);
  const previousRows = useMemo<ReportRow[]>(() => {
    const rows: ReportRow[] = [];
    for (const transaction of previousTransactions) {
      const customer = getTransactionCustomer(transaction, customers);
      for (const item of transaction.items) {
        const product = productMap.get(item.productId);
        rows.push({
          id: `${transaction.id}-${item.productId}-${rows.length}`,
          transactionId: transaction.id,
          date: transaction.date,
          itemName: item.productName ?? product?.name ?? 'Produk',
          quantity: item.quantity,
          buyPrice: item.buyPrice ?? product?.buyPrice ?? 0,
          sellPrice: item.price,
          buyerName: customer.name || transaction.customerName || '-',
        });
      }
    }
    return rows;
  }, [customers, previousTransactions, productMap]);
  const previousSold = previousRows.reduce((total, row) => total + (row.sellPrice * row.quantity), 0);
  const previousItems = previousRows.reduce((total, row) => total + row.quantity, 0);
  const previousProfit = previousRows.reduce((total, row) => total + ((row.sellPrice - row.buyPrice) * row.quantity), 0);
  const previousCustomers = new Set(previousTransactions.map((transaction) => transaction.customerId)).size;

  const chartData = useMemo(() => {
    const grouped = new Map<string, ChartPoint>();
    for (const row of filteredRows) {
      const date = new Date(row.date);
      const key = period.mode === 'month'
        ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        : `${date.getFullYear()}-${date.getMonth()}`;
      const existing = grouped.get(key);
      const sold = row.sellPrice * row.quantity;
      const profit = (row.sellPrice - row.buyPrice) * row.quantity;
      if (existing) {
        existing.sold += sold;
        existing.profit += profit;
      } else {
        grouped.set(key, {
          label: period.mode === 'month'
            ? format(date, 'dd')
            : format(date, 'MMM yyyy'),
          tooltipLabel: period.mode === 'month'
            ? format(date, 'dd MMM yyyy')
            : format(date, 'MMMM yyyy'),
          date: period.mode === 'month'
            ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
            : new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          sold,
          profit,
        });
      }
    }
    return Array.from(grouped.values()).sort((left, right) => left.date - right.date);
  }, [filteredRows, period.mode]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'date' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSortKey('date');
    setSortDirection('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery.trim()) || sortKey !== 'date' || sortDirection !== 'desc';

  const handleDownload = async () => {
    try {
      await generateExcelReport(transactions, products, customers, period);
      notify('success', 'Laporan berhasil dibuat', `Laporan ${getPeriodDisplayLabel(period)} mulai diunduh.`);
    } catch {
      notify('error', 'Laporan gagal dibuat', 'Silakan coba kembali beberapa saat lagi.');
    }
  };

  const isLoading = transactionsQuery.isLoading || productsQuery.isLoading || customersQuery.isLoading;
  const isTableLoading = isLoading || reportItemsQuery.isLoading;

  return (
    <div className="animate-soft-in space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-finance-950">Laporan Penjualan</h1>
          <p className="mt-1 text-sm text-finance-500">Lihat rekap item transaksi langsung dari dashboard.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector period={period} onChange={handlePeriodChange} availableYears={availableYears} />
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download size={16} />
            Download Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Omzet" value={`Rp ${totalSold.toLocaleString('id-ID')}`} trend={period.mode === 'all' ? undefined : formatPercentDelta(totalSold, previousSold)} isPositive={totalSold >= previousSold} icon={<TrendingUp size={20} />} />
        <MetricCard title="Item Terjual" value={totalItems.toLocaleString('id-ID')} trend={period.mode === 'all' ? undefined : formatNumberDelta(totalItems, previousItems)} isPositive={totalItems >= previousItems} icon={<Package size={20} />} />
        <MetricCard title="Jumlah Pelanggan" value={uniqueCustomers.size.toLocaleString('id-ID')} trend={period.mode === 'all' ? undefined : formatNumberDelta(uniqueCustomers.size, previousCustomers)} isPositive={uniqueCustomers.size >= previousCustomers} icon={<FileText size={20} />} />
        <MetricCard title="Total Untung" value={`Rp ${totalProfit.toLocaleString('id-ID')}`} trend={period.mode === 'all' ? undefined : formatProfitSignal(totalProfit, previousProfit)} isPositive={totalProfit >= 0} icon={<TrendingUp size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportChart
          title="Tren Omzet"
          subtitle=""
          data={chartData}
          dataKey="sold"
          gradientId="reportSoldFill"
          color="#ef4444"
        />
        <ReportChart
          title="Tren Keuntungan"
          subtitle=""
          data={chartData}
          dataKey="profit"
          gradientId="reportProfitFill"
          color="#d6b45d"
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-finance-400" />
              <Input
                placeholder="Cari item atau buyer..."
                className="h-10 pl-10"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} className="gap-2 text-finance-500">
                <RotateCcw size={15} />
                Reset
              </Button>
            )}
          </div>

          <div className="md:hidden">
            {isTableLoading ? (
              <p className="py-8 text-center text-sm text-finance-500">Memuat laporan...</p>
            ) : paginatedRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-finance-500">Tidak ada data laporan untuk filter ini.</p>
            ) : (
              <div className="divide-y divide-finance-100">
                {paginatedRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(`/transactions/${row.transactionId}`)}
                    className="w-full py-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-finance-950">{row.itemName}</p>
                        <p className="mt-1 text-xs text-finance-500">{row.buyerName}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-finance-400">Tanggal</p>
                        <p className="mt-1 font-semibold text-finance-900">{format(new Date(row.date), 'dd MMM yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-finance-400">Qty</p>
                        <p className="mt-1 font-semibold text-finance-900">{row.quantity}</p>
                      </div>
                      <div>
                        <p className="text-finance-400">Sold</p>
                        <p className="mt-1 font-semibold text-finance-900">Rp {row.sellPrice.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="table-fixed">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[30%]" />
                <col className="w-[9%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Tanggal Beli" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHead label="Nama Item" sortKey="itemName" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  <SortableHead label="Jumlah" sortKey="quantity" activeKey={sortKey} direction={sortDirection} align="right" onSort={handleSort} />
                  <SortableHead label="Modal/pcs" sortKey="buyPrice" activeKey={sortKey} direction={sortDirection} align="right" onSort={handleSort} />
                  <SortableHead label="Sold/pcs" sortKey="sellPrice" activeKey={sortKey} direction={sortDirection} align="right" onSort={handleSort} />
                  <SortableHead label="Nama Buyer" sortKey="buyerName" activeKey={sortKey} direction={sortDirection} onSort={handleSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isTableLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-finance-500">Memuat laporan...</TableCell>
                  </TableRow>
                ) : paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-finance-500">Tidak ada transaksi lunas untuk filter ini.</TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => navigate(`/transactions/${row.transactionId}`)}>
                      <TableCell className="whitespace-nowrap">{format(new Date(row.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <p className="truncate font-semibold text-finance-950" title={row.itemName}>{row.itemName}</p>
                      </TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">Rp {row.buyPrice.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold">Rp {row.sellPrice.toLocaleString('id-ID')}</TableCell>
                      <TableCell><p className="truncate" title={row.buyerName}>{row.buyerName}</p></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={paginatedTotalItems}
            totalPages={paginatedTotalPages}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
