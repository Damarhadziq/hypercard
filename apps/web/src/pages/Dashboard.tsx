import { useState, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@pokemon-finance/ui';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Package, CreditCard, PlusCircle, Download, Calendar, ChevronDown, FileClock } from 'lucide-react';
import { useFeedback } from '../components/Feedback';
import { useDashboardRecent, useDashboardReportSummary } from '../hooks/useApiQueries';
import type { ReportPeriod } from '../lib/generateReport';
import { customersService } from '../services/customers';
import { productsService } from '../services/products';
import { transactionsService } from '../services/transactions';
import { DashboardSkeleton } from '../components/LoadingSkeleton';

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

function formatAxisRupiah(value: number) {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
  }
  return `${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}k`;
}

function formatPercentDelta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

function formatProfitSignal(current: number, previous: number) {
  const delta = current - previous;
  if (previous === 0) return delta === 0 ? '0%' : `${delta > 0 ? '+' : '-'}100%`;
  const value = Math.abs((delta / Math.abs(previous)) * 100);
  const sign = delta >= 0 ? '+' : '-';
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
          <div className="animate-dropdown-in fixed inset-x-4 top-24 z-50 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-finance-200 bg-white p-2 shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+6px)] md:w-72">
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
  availableYears,
}: {
  availableYears: number[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { notify } = useFeedback();

  const handleDownload = async (period: ReportPeriod) => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const [transactionsResult, productsResult, customersResult] = await Promise.all([
        transactionsService.list({ limit: 1000 }),
        productsService.list({ limit: 1000 }),
        customersService.list({ limit: 1000 }),
      ]);
      const { generateExcelReport } = await import('../lib/generateReport');
      await generateExcelReport(
        transactionsResult.data,
        productsResult.data,
        customersResult.data,
        period,
      );
      notify('success', 'Laporan berhasil dibuat', `Laporan ${getPeriodDisplayLabel(period)} mulai diunduh.`);
      setIsOpen(false);
    } catch {
      notify('error', 'Laporan gagal dibuat', 'Silakan coba kembali beberapa saat lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        disabled={isDownloading}
        className="dropdown-trigger flex items-center gap-2 px-3 text-sm"
      >
        <Download size={16} />
        <span className="hidden sm:inline">{isDownloading ? 'Menyiapkan...' : 'Download Laporan'}</span>
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
          <div className="animate-dropdown-in fixed inset-x-4 top-24 z-50 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-finance-200 bg-white shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+6px)] md:w-64">
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
  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>({
    mode: 'month',
    month: now.getMonth(),
    year: now.getFullYear(),
  });
  const summaryQuery = useDashboardReportSummary({
    mode: period.mode,
    month: period.month,
    year: period.year,
  });
  const recentQuery = useDashboardRecent(3);
  const currentSummary = summaryQuery.data?.current;
  const previousSummary = summaryQuery.data?.previous;
  const totalSold = currentSummary?.totalSold ?? 0;
  const totalProfit = currentSummary?.totalProfit ?? 0;
  const productsSold = currentSummary?.totalItems ?? 0;
  const customerCount = currentSummary?.customerCount ?? 0;
  const transactionCount = currentSummary?.transactionCount ?? 0;
  const previousSold = previousSummary?.totalSold ?? 0;
  const previousProfit = previousSummary?.totalProfit ?? 0;
  const previousProductsSold = previousSummary?.totalItems ?? 0;
  const previousCustomerCount = previousSummary?.customerCount ?? 0;
  const availableYears = summaryQuery.data?.availableYears ?? [now.getFullYear()];
  const chartData = useMemo(
    () => (summaryQuery.data?.chart ?? []).map((point) => {
      const date = new Date(point.date);
      return {
        name: period.mode === 'month'
          ? format(date, 'dd')
          : period.mode === 'year'
            ? format(date, 'MMM')
            : format(date, 'MMM yy'),
        date: date.toISOString(),
        total: point.sold,
      };
    }),
    [period.mode, summaryQuery.data?.chart],
  );
  const recentTransactions = recentQuery.data ?? [];
  const isLoading = summaryQuery.isLoading || recentQuery.isLoading;

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
          <DownloadButton availableYears={availableYears} />
          <Button onClick={() => navigate('/invoices')} className="flex items-center justify-center gap-2 px-3 text-sm">
            <PlusCircle size={16} />
            <span className="hidden sm:inline">Buat Invoice</span>
          </Button>
        </div>
      </div>

      {isLoading && (
        <DashboardSkeleton />
      )}

      {!isLoading && !summaryQuery.data?.hasCurrentData && (
        <p className="text-xs text-finance-400">Belum ada transaksi di periode ini</p>
      )}

      {/* Metric Cards */}
      {!isLoading && <div className="grid min-w-0 grid-cols-1 gap-4 pt-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Omzet"
          value={`Rp ${totalSold.toLocaleString('id-ID')}`}
          trend={period.mode === 'all' ? `${transactionCount} transaksi` : formatPercentDelta(totalSold, previousSold)}
          isPositive={totalSold >= previousSold}
          isNeutral={period.mode === 'all' || totalSold === previousSold}
          icon={<TrendingUp size={18} />}
          iconTone="border-rose-400/35 bg-rose-500/10 text-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.16)]"
        />
        <MetricCard
          title="Total Untung"
          value={`Rp ${totalProfit.toLocaleString('id-ID')}`}
          trend={period.mode === 'all' ? `${transactionCount} transaksi lunas` : formatProfitSignal(totalProfit, previousProfit)}
          isPositive={totalProfit >= previousProfit}
          isNeutral={period.mode === 'all' || totalProfit === previousProfit}
          icon={<CreditCard size={18} />}
          iconTone="border-emerald-400/35 bg-emerald-500/10 text-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.16)]"
        />
        <MetricCard
          title="Produk Terjual"
          value={productsSold.toString()}
          trend={period.mode === 'all' ? 'unit terjual' : formatNumberDelta(productsSold, previousProductsSold)}
          isPositive={productsSold >= previousProductsSold}
          isNeutral={period.mode === 'all' || productsSold === previousProductsSold}
          icon={<Package size={18} />}
          iconTone="border-sky-400/35 bg-sky-500/10 text-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.16)]"
        />
        <MetricCard
          title="Jumlah Pelanggan"
          value={customerCount.toLocaleString('id-ID')}
          trend={period.mode === 'all' ? 'pelanggan aktif' : formatNumberDelta(customerCount, previousCustomerCount)}
          isPositive={customerCount >= previousCustomerCount}
          isNeutral={period.mode === 'all' || customerCount === previousCustomerCount}
          icon={<FileClock size={18} />}
          iconTone="border-amber-400/35 bg-amber-500/10 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.16)]"
        />
      </div>}

      {/* Charts & Tables */}
      {!isLoading && <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
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
                <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={180}>
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
                const customerName = trx.customerName || 'Pembeli';
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
      </div>}
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  isPositive,
  isNeutral,
  icon,
  iconTone,
}: {
  title: string;
  value: string;
  trend: string;
  isPositive?: boolean;
  isNeutral?: boolean;
  icon: ReactNode;
  iconTone: string;
}) {
  const trendTone = isNeutral
    ? 'text-finance-500'
    : isPositive
      ? 'text-green-500'
      : 'text-red-500';

  return (
    <Card className="animate-soft-in min-w-0 overflow-hidden">
      <CardContent className="flex h-full min-h-32 flex-col justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-finance-500">{title}</p>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${iconTone}`}>
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-2">
            <h4 className="min-w-0 whitespace-nowrap text-lg font-bold text-finance-950 xl:text-xl 2xl:text-2xl">{value}</h4>
            <span className={`shrink-0 whitespace-nowrap text-[11px] font-extrabold 2xl:text-xs ${trendTone}`}>
              {trend}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
