import { useState, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@pokemon-finance/ui';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Package, CreditCard, PlusCircle, Download, Calendar, ChevronDown, FileClock } from 'lucide-react';
import type { Customer, Product, Transaction } from '../store/useStore';
import { useFeedback } from '../components/Feedback';
import { useCustomers, useProducts, useTransactions } from '../hooks/useApiQueries';
import {
  filterTransactionsByPeriod,
  calculateStats,
  generateChartData,
  generateExcelReport,
  type ReportPeriod,
} from '../lib/generateReport';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

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
  const years = new Set(transactions.map((t) => new Date(t.date).getFullYear()));
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
}

function formatAxisRupiah(value: number) {
  if (value === 0) return 'Rp 0';
  const millions = value / 1_000_000;
  const formatted = Number.isInteger(millions)
    ? millions.toLocaleString('id-ID')
    : millions.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  return `Rp ${formatted} jt`;
}

function getPreviousPeriod(period: ReportPeriod): ReportPeriod {
  if (period.mode === 'month' && period.month !== undefined && period.year !== undefined) {
    if (period.month === 0) return { mode: 'month', month: 11, year: period.year - 1 };
    return { mode: 'month', month: period.month - 1, year: period.year };
  }
  if (period.mode === 'year' && period.year !== undefined) {
    return { mode: 'year', year: period.year - 1 };
  }
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
  const delta = current - previous;
  return `${delta >= 0 ? '+' : ''}${delta.toLocaleString('id-ID')}`;
}

// ─── Period Selector Component ──────────────────────────

function PeriodSelector({
  period,
  onChange,
  availableYears,
}: {
  period: ReportPeriod;
  onChange: (p: ReportPeriod) => void;
  availableYears: number[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="dropdown-trigger flex items-center gap-2 rounded-lg border border-finance-200 bg-white px-3 py-2 text-sm font-medium text-finance-700 shadow-sm hover:border-finance-300 hover:bg-finance-50"
      >
        <Calendar size={15} className="text-finance-400" />
        <span>{getPeriodDisplayLabel(period)}</span>
        <ChevronDown size={14} className={`text-finance-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup"
          />
          <div className="animate-dropdown-in absolute right-0 top-[calc(100%+6px)] z-50 w-72 overflow-hidden rounded-xl border border-finance-200 bg-white p-2 shadow-xl">
            {/* Quick presets */}
            <div className="mb-2 space-y-0.5">
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-finance-400">Cepat</p>
              <PeriodOption
                label="Bulan Ini"
                active={period.mode === 'month' && period.month === new Date().getMonth() && period.year === new Date().getFullYear()}
                onClick={() => {
                  onChange({ mode: 'month', month: new Date().getMonth(), year: new Date().getFullYear() });
                  setIsOpen(false);
                }}
              />
              <PeriodOption
                label="Tahun Ini"
                active={period.mode === 'year' && period.year === new Date().getFullYear()}
                onClick={() => {
                  onChange({ mode: 'year', year: new Date().getFullYear() });
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
              {availableYears.map((year) => (
                <div key={year} className="mb-1">
                  <p className="px-2 py-1 text-xs font-bold text-finance-700">{year}</p>
                  <div className="grid grid-cols-4 gap-1 px-1">
                    {MONTH_SHORT.map((m, idx) => {
                      const isActive = period.mode === 'month' && period.month === idx && period.year === year;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            onChange({ mode: 'month', month: idx, year });
                            setIsOpen(false);
                          }}
                          className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'text-finance-600 hover:bg-finance-100 hover:text-finance-900'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-finance-100 pt-2">
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold text-finance-400">Per Tahun</p>
              <div className="grid grid-cols-3 gap-1 px-1">
                {availableYears.map((year) => {
                  const isActive = period.mode === 'year' && period.year === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        onChange({ mode: 'year', year });
                        setIsOpen(false);
                      }}
                      className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-finance-600 hover:bg-finance-100 hover:text-finance-900'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
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

// ─── Download Period Selector (for choosing report period) ──

function DownloadButton({
  transactions,
  products,
  customers,
  availableYears,
}: {
  transactions: Transaction[];
  products: Product[];
  customers: Customer[];
  availableYears: number[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { notify } = useFeedback();

  const handleDownload = async (period: ReportPeriod) => {
    try {
      await generateExcelReport(transactions, products, customers, period);
      notify('success', 'Laporan berhasil dibuat', `Laporan ${getPeriodDisplayLabel(period)} mulai diunduh.`);
      setIsOpen(false);
    } catch {
      notify('error', 'Laporan gagal dibuat', 'Silakan coba kembali beberapa saat lagi.');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-3 text-sm"
      >
        <Download size={16} />
        <span className="hidden sm:inline">Download Laporan</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup"
          />
          <div className="animate-dropdown-in absolute right-0 top-[calc(100%+6px)] z-50 w-64 overflow-hidden rounded-xl border border-finance-200 bg-white shadow-xl">
            <div className="p-2">
              <p className="px-2 py-1 text-[11px] font-semibold text-finance-400">Download Excel</p>

              {/* Current month */}
              <button
                type="button"
                onClick={() =>
                  handleDownload({
                    mode: 'month',
                    month: new Date().getMonth(),
                    year: new Date().getFullYear(),
                  })
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-finance-700 transition-colors hover:bg-finance-50"
              >
                <Calendar size={15} className="shrink-0 text-finance-400" />
                Bulan Ini ({MONTH_SHORT[new Date().getMonth()]} {new Date().getFullYear()})
              </button>

              {/* Per Year */}
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleDownload({ mode: 'year', year })}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-finance-700 transition-colors hover:bg-finance-50"
                >
                  <Calendar size={15} className="shrink-0 text-finance-400" />
                  Tahun {year}
                </button>
              ))}

              {/* All time */}
              <div className="mt-1 border-t border-finance-100 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownload({ mode: 'all' })}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  <Download size={15} className="shrink-0" />
                  Semua Periode (Keseluruhan)
                </button>
              </div>

              {/* Per Month (expandable) */}
              <div className="mt-1 border-t border-finance-100 pt-1">
                <p className="px-3 py-1 text-[11px] font-semibold text-finance-400">Per Bulan</p>
                <div className="max-h-40 overflow-y-auto">
                  {availableYears.map((year) => (
                    <div key={year}>
                      <p className="px-3 py-1 text-xs font-bold text-finance-600">{year}</p>
                      <div className="grid grid-cols-4 gap-0.5 px-2 pb-1">
                        {MONTH_SHORT.map((m, idx) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleDownload({ mode: 'month', month: idx, year })}
                            className="rounded px-1.5 py-1 text-[11px] font-medium text-finance-600 transition-colors hover:bg-finance-100 hover:text-finance-900"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const transactionsQuery = useTransactions({ limit: 1000 });
  const productsQuery = useProducts({ limit: 1000 });
  const customersQuery = useCustomers({ limit: 1000 });
  const transactions = useMemo(() => transactionsQuery.data?.data ?? [], [transactionsQuery.data]);
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  const customers = useMemo(() => customersQuery.data?.data ?? [], [customersQuery.data]);

  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>({
    mode: 'month',
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  const availableYears = useMemo(() => getAvailableYears(transactions), [transactions]);

  const filteredTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, period)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, period]
  );

  const stats = useMemo(
    () => calculateStats(filteredTransactions, products),
    [filteredTransactions, products]
  );

  const previousTransactions = useMemo(
    () => period.mode === 'all' ? [] : filterTransactionsByPeriod(transactions, getPreviousPeriod(period)),
    [period, transactions],
  );

  const previousStats = useMemo(
    () => calculateStats(previousTransactions, products),
    [previousTransactions, products],
  );

  const customerCount = useMemo(
    () => new Set(filteredTransactions.map((transaction) => transaction.customerId)).size,
    [filteredTransactions],
  );

  const previousCustomerCount = useMemo(
    () => new Set(previousTransactions.map((transaction) => transaction.customerId)).size,
    [previousTransactions],
  );

  const chartData = useMemo(
    () => generateChartData(filteredTransactions, period),
    [filteredTransactions, period]
  );

  const recentTransactions = filteredTransactions.slice(0, 3);

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {/* Quick Actions & Header */}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-finance-950">Ringkasan Penjualan</h1>
          <p className="mt-1 max-w-full text-sm text-finance-500">Pantau performa penjualan Hypercard.</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <PeriodSelector period={period} onChange={setPeriod} availableYears={availableYears} />
          <DownloadButton
            transactions={transactions}
            products={products}
            customers={customers}
            availableYears={availableYears}
          />
          <Button onClick={() => navigate('/invoices')} className="flex items-center justify-center gap-2 px-3 text-sm">
            <PlusCircle size={16} />
            <span className="hidden sm:inline">Buat Invoice</span>
          </Button>
        </div>
      </div>

      {/* Period Badge */}
      <div className="flex items-center gap-2">
        <span className="surface-pill inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold">
          <Calendar size={13} />
          {getPeriodDisplayLabel(period)}
        </span>
        {filteredTransactions.length === 0 && (
          <span className="text-xs text-finance-400">— Belum ada transaksi di periode ini</span>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Omzet"
          value={`Rp ${stats.omzet.toLocaleString('id-ID')}`}
          trend={period.mode === 'all' ? `${stats.transactionCount} transaksi` : formatPercentDelta(stats.omzet, previousStats.omzet)}
          isPositive={stats.omzet >= previousStats.omzet}
          icon={<TrendingUp className="text-finance-500" size={20} />}
        />
        <MetricCard
          title="Total Untung"
          value={`Rp ${stats.totalProfit.toLocaleString('id-ID')}`}
          trend={period.mode === 'all' ? `${stats.completedCount} transaksi lunas` : formatProfitSignal(stats.totalProfit, previousStats.totalProfit)}
          isPositive={stats.totalProfit >= 0}
          icon={<CreditCard className="text-finance-500" size={20} />}
        />
        <MetricCard
          title="Produk Terjual"
          value={stats.productsSold.toString()}
          trend={period.mode === 'all' ? 'unit terjual' : formatNumberDelta(stats.productsSold, previousStats.productsSold)}
          isPositive={stats.productsSold >= previousStats.productsSold}
          icon={<Package className="text-finance-500" size={20} />}
        />
        <MetricCard
          title="Jumlah Pelanggan"
          value={customerCount.toLocaleString('id-ID')}
          trend={period.mode === 'all' ? 'pelanggan aktif' : formatNumberDelta(customerCount, previousCustomerCount)}
          isPositive={customerCount >= previousCustomerCount}
          icon={<FileClock className="text-accent" size={20} />}
        />
      </div>

      {/* Charts & Tables */}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main Chart */}
        <Card className="animate-soft-in min-w-0 lg:col-span-2">
          <CardHeader className="px-6 pb-4 pt-5">
            <CardTitle>
              {period.mode === 'month' ? 'Grafik Omzet Harian' : period.mode === 'year' ? 'Grafik Omzet Bulanan' : 'Grafik Omzet'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="w-full min-w-0 overflow-hidden">
              {chartData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-finance-400">
                  Belum ada data transaksi di periode ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280} debounce={180}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(214, 180, 93, 0.22)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis
                      width={78}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#8f9299' }}
                      tickFormatter={formatAxisRupiah}
                      dx={-4}
                    />
                    <Tooltip
                      cursor={{ stroke: 'rgba(214, 180, 93, 0.55)', strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0]?.payload as { date?: string; total?: number };
                        return (
                          <div className="min-w-[220px] rounded-lg border border-accent/35 bg-[#0c0c0f]/90 px-4 py-3.5 text-white shadow-xl shadow-black/35 backdrop-blur-md">
                            <div className="flex items-center justify-between gap-5">
                              <span className="text-xs text-finance-400">Tanggal</span>
                              <span className="whitespace-nowrap text-xs font-semibold text-white">
                                {point.date ? format(new Date(point.date), 'dd MM yy') : '-'}
                              </span>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between gap-5 border-t border-accent/15 pt-2.5">
                              <span className="text-xs text-finance-400">Jumlah omzet</span>
                              <span className="whitespace-nowrap text-sm font-bold text-white">
                                Rp {(point.total ?? 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" isAnimationActive animationDuration={700} animationEasing="ease-out" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="animate-soft-in min-w-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-6 pb-4 pt-5">
            <CardTitle>Transaksi Terbaru</CardTitle>
            <Link to="/transactions" className="shrink-0 text-sm font-semibold text-primary transition-colors hover:text-primary-hover">
              Lihat Semua
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="space-y-4">
              {recentTransactions.map((trx) => {
                const customerName = trx.customerName || customers.find((customer) => customer.id === trx.customerId)?.name || 'Pembeli';
                return (
                <Link
                  key={trx.id}
                  to={`/transactions/${trx.id}`}
                  className="group animate-soft-in flex min-w-0 items-center justify-between gap-3 rounded-md p-2 transition-colors hover:bg-finance-50"
                >
                  <div className="flex min-w-0 items-center space-x-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-finance-100 font-semibold text-finance-600">
                      {customerName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-none text-finance-900">{customerName}</p>
                      <p className="mt-1 truncate text-xs text-finance-500 transition-colors group-hover:text-primary">{trx.invoiceNumber}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-finance-900">Rp {trx.total.toLocaleString('id-ID')}</p>
                    <p className={`text-xs font-medium mt-1 ${trx.status === 'Lunas' ? 'text-green-600' : 'text-accent'}`}>
                      {trx.status}
                    </p>
                  </div>
                </Link>
              );
              })}
              {recentTransactions.length === 0 && (
                <p className="py-6 text-center text-sm text-finance-500">Belum ada transaksi di periode ini.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, isPositive, isNeutral, icon }: { title: string, value: string, trend: string, isPositive?: boolean, isNeutral?: boolean, icon: ReactNode }) {
  const trendTone = isNeutral ? 'text-finance-500' : isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <Card className="animate-soft-in relative min-w-0 overflow-hidden">
      <div className="pointer-events-none absolute right-4 top-4 text-accent opacity-[0.12] [&_svg]:h-20 [&_svg]:w-20">
        {icon}
      </div>
      <CardContent className="relative z-10 flex h-full min-h-32 flex-col justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-finance-500">{title}</p>
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-2">
            <h4 className="min-w-0 whitespace-nowrap text-xl font-bold text-finance-950 2xl:text-2xl">{value}</h4>
            <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold ${trendTone}`}>
              {trend}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
