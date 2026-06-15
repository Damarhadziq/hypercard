import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@pokemon-finance/ui';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDown, ArrowUp, ArrowUpDown, BadgeDollarSign, Calendar, ChevronDown, CircleDollarSign, Crown, Download, FileText, Gauge, Info, Package, RotateCcw, Search, TrendingUp, WalletCards } from 'lucide-react';
import { format } from 'date-fns';
import { useDashboardReportItems, useDashboardReportSummary } from '../hooks/useApiQueries';
import useClampedPage from '../hooks/useClampedPage';
import type { ReportPeriod } from '../lib/generateReport';
import { useFeedback } from '../components/Feedback';
import Pagination from '../components/Pagination';
import { customersService } from '../services/customers';
import { productsService } from '../services/products';
import { transactionsService } from '../services/transactions';
import { DashboardSkeleton, MobileListSkeleton, TableSkeletonRows } from '../components/LoadingSkeleton';
import {
  calculateCostBreakdown,
  formatPercentage,
  formatRupiah,
  generateSalesInsights,
  type InsightStatus,
  type SalesInsight,
} from '../lib/reportInsights';

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
  const value = current - previous;
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('id-ID')}`;
}

function formatChartAxisValue(value: number) {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
  }
  return `${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}k`;
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
          <div className="animate-dropdown-in fixed inset-x-4 top-24 z-50 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-finance-200 bg-white p-2 shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+6px)] md:w-72">
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
  isNeutral = false,
  active = false,
  onClick,
  iconTone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  isPositive?: boolean;
  isNeutral?: boolean;
  active?: boolean;
  onClick?: () => void;
  iconTone: string;
}) {
  const trendTone = isNeutral
    ? 'border-finance-300 bg-finance-100 text-finance-500'
    : isPositive
      ? 'border-green-500/25 bg-green-500/10 text-green-500'
      : 'border-red-500/25 bg-red-500/10 text-red-500';

  const content = (
    <Card className={`h-full overflow-hidden transition-all ${active ? 'border-accent/70 bg-accent/10 shadow-[inset_0_0_0_1px_rgba(214,180,93,0.22)]' : ''}`}>
      <CardContent className="flex min-h-32 h-full flex-col justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-finance-500">{title}</p>
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${iconTone}`}>
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <p className="whitespace-nowrap text-lg font-extrabold text-finance-950 2xl:text-2xl">{value}</p>
            {trend && (
              <p className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold 2xl:text-xs ${trendTone}`}>
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

interface CustomerRanking {
  id: string;
  name: string;
  spend: number;
  orders: number;
}

function CustomerRankingCard({
  title,
  icon,
  data,
}: {
  title: string;
  icon: React.ReactNode;
  data: CustomerRanking[];
}) {
  const rankTone = [
    'border-amber-300/40 bg-amber-400/10 text-amber-300',
    'border-slate-300/30 bg-slate-300/10 text-slate-300',
    'border-orange-400/30 bg-orange-500/10 text-orange-300',
    'border-sky-400/25 bg-sky-500/10 text-sky-300',
    'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  ];

  return (
    <Card className="h-full min-w-0">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-bold text-finance-950">{title}</h2>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent shadow-[0_0_14px_rgba(214,180,93,0.12)]">
            {icon}
          </span>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {Array.from({ length: 5 }, (_, index) => data[index]).map((customer, index) => (
            customer ? (
              <div key={customer.id} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-finance-50">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold ${rankTone[index]}`}>
                  {index === 0 ? <Crown size={15} /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-finance-950">{customer.name}</p>
                  <p className="mt-0.5 text-xs text-finance-500">{customer.orders} transaksi</p>
                </div>
                <p className="shrink-0 text-right text-xs font-bold text-finance-900">
                  Rp {customer.spend.toLocaleString('id-ID')}
                </p>
              </div>
            ) : (
              <div key={`empty-${index}`} className="flex items-center gap-3 rounded-md px-2 py-2 opacity-60">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold ${rankTone[index]}`}>
                  {index + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-finance-500">Belum ada pelanggan</p>
                <span className="text-xs font-bold text-finance-400">-</span>
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
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

function getChartTicks(data: ChartPoint[], maxTicks = 8): number[] {
  if (data.length <= maxTicks) return data.map((point) => point.date);

  const start = data[0]!.date;
  const end = data[data.length - 1]!.date;
  return Array.from(
    { length: maxTicks },
    (_, index) => start + ((end - start) * index) / (maxTicks - 1),
  );
}

function formatChartDateTick(value: number, data: ChartPoint[]): string {
  const date = new Date(value);
  if (data.length > 12) return String(date.getDate());
  if (data.length === 12 && data.every((point) => /^\d+$/.test(point.label))) {
    return String(date.getMonth() + 1);
  }
  return format(date, 'MMM yyyy');
}

function buildContinuousChartData(
  rows: { date: number; sold: number; profit: number }[],
  period: ReportPeriod,
): ChartPoint[] {
  const grouped = new Map<number, Pick<ChartPoint, 'sold' | 'profit'>>();

  for (const row of rows) {
    const date = new Date(row.date);
    const timestamp = period.mode === 'month'
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      : new Date(date.getFullYear(), date.getMonth(), 1).getTime();
    const current = grouped.get(timestamp) ?? { sold: 0, profit: 0 };
    current.sold += row.sold;
    current.profit += row.profit;
    grouped.set(timestamp, current);
  }

  if (period.mode === 'month' && period.month !== undefined && period.year !== undefined) {
    const daysInMonth = new Date(period.year, period.month + 1, 0).getDate();
    const now = new Date();
    const isCurrentMonth = period.month === now.getMonth() && period.year === now.getFullYear();
    const visibleDays = isCurrentMonth ? Math.min(daysInMonth, now.getDate()) : daysInMonth;
    return Array.from({ length: visibleDays }, (_, index) => {
      const date = new Date(period.year!, period.month!, index + 1);
      const timestamp = date.getTime();
      const values = grouped.get(timestamp) ?? { sold: 0, profit: 0 };
      return {
        label: String(index + 1),
        tooltipLabel: format(date, 'dd MMM yyyy'),
        date: timestamp,
        ...values,
      };
    });
  }

  if (period.mode === 'year' && period.year !== undefined) {
    return Array.from({ length: 12 }, (_, month) => {
      const date = new Date(period.year!, month, 1);
      const timestamp = date.getTime();
      const values = grouped.get(timestamp) ?? { sold: 0, profit: 0 };
      return {
        label: String(month + 1),
        tooltipLabel: format(date, 'MMMM yyyy'),
        date: timestamp,
        ...values,
      };
    });
  }

  if (grouped.size === 0) return [];
  const timestamps = Array.from(grouped.keys()).sort((left, right) => left - right);
  const start = new Date(timestamps[0]!);
  const end = new Date(timestamps[timestamps.length - 1]!);
  const points: ChartPoint[] = [];

  for (
    let date = new Date(start.getFullYear(), start.getMonth(), 1);
    date <= end;
    date = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  ) {
    const timestamp = date.getTime();
    const values = grouped.get(timestamp) ?? { sold: 0, profit: 0 };
    points.push({
      label: format(date, 'MMM yyyy'),
      tooltipLabel: format(date, 'MMMM yyyy'),
      date: timestamp,
      ...values,
    });
  }

  return points;
}

const INSIGHT_ICON: Record<SalesInsight['key'], React.ReactNode> = {
  empty: <Info size={17} />,
  revenue: <TrendingUp size={17} />,
  profit: <BadgeDollarSign size={17} />,
  margin: <Gauge size={17} />,
  cost: <CircleDollarSign size={17} />,
};

const INSIGHT_TONE: Record<InsightStatus, string> = {
  Positif: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-400',
  'Perlu Dipantau': 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  Info: 'border-sky-400/25 bg-sky-500/10 text-sky-300',
};

function InsightCard({ insight }: { insight: SalesInsight }) {
  const descriptionParts = insight.description.split(/((?:Rp\s*)?[\d.,]+%?)/g);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent">
            {INSIGHT_ICON[insight.key]}
          </span>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${INSIGHT_TONE[insight.status]}`}>
            {insight.status}
          </span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-finance-950">{insight.title}</h3>
          <p className="mt-1 text-xs leading-5 text-finance-500">
            {descriptionParts.map((part, index) => (
              /\d/.test(part)
                ? <strong key={`${part}-${index}`} className="font-extrabold text-finance-900">{part}</strong>
                : part
            ))}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  label,
  value,
  tone = 'text-finance-950',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <p className="text-xs font-semibold text-finance-500">{label}</p>
        <p className={`mt-2 text-lg font-extrabold ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
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
  const xAxisTicks = getChartTicks(data, 8);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col p-5">
        <div className="mb-4">
          <h2 className="font-bold text-finance-950">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-finance-500">{subtitle}</p>}
        </div>

        {data.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-finance-500">
            Tidak ada data untuk divisualisasikan.
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={180}>
              <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(214,180,93,0.18)" />
                <XAxis
                  dataKey="date"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={xAxisTicks}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8f9299' }}
                  tickFormatter={(value: number) => formatChartDateTick(value, data)}
                />
                <YAxis
                  width={66}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#8f9299' }}
                  tickFormatter={formatChartAxisValue}
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
  const { notify } = useFeedback();
  const [isDownloading, setIsDownloading] = useState(false);

  const now = new Date();
  const [period, setPeriod] = useState<ReportPeriod>({ mode: 'month', month: now.getMonth(), year: now.getFullYear() });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const reportSummaryQuery = useDashboardReportSummary({
    mode: period.mode,
    month: period.month,
    year: period.year,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setPage(1);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const reportItemsQuery = useDashboardReportItems({
    mode: period.mode,
    month: period.month,
    year: period.year,
    search: debouncedSearchQuery || undefined,
    sortKey,
    sortDirection,
    page,
    limit: pageSize,
  });
  const paginatedRows = reportItemsQuery.data?.data ?? [];
  const paginatedTotalItems = reportItemsQuery.data?.pagination.total ?? 0;
  const paginatedTotalPages = Math.max(1, Math.ceil(paginatedTotalItems / pageSize));

  useClampedPage(page, paginatedTotalPages, setPage, !reportItemsQuery.isFetching);

  const handlePeriodChange = (nextPeriod: ReportPeriod) => {
    setPeriod(nextPeriod);
    setPage(1);
  };

  const availableYears = reportSummaryQuery.data?.availableYears ?? [now.getFullYear()];
  const currentSummary = reportSummaryQuery.data?.current;
  const previousSummary = reportSummaryQuery.data?.previous;
  const totalSold = currentSummary?.totalSold ?? 0;
  const totalItems = currentSummary?.totalItems ?? 0;
  const totalProfit = currentSummary?.totalProfit ?? 0;
  const customerCount = currentSummary?.customerCount ?? 0;
  const previousSold = previousSummary?.totalSold ?? 0;
  const previousItems = previousSummary?.totalItems ?? 0;
  const previousProfit = previousSummary?.totalProfit ?? 0;
  const previousCustomers = previousSummary?.customerCount ?? 0;
  const costBreakdown = currentSummary?.costBreakdown ?? calculateCostBreakdown([]);
  const previousCostBreakdown = previousSummary?.costBreakdown ?? calculateCostBreakdown([]);
  const topBySpend = reportSummaryQuery.data?.topSpend ?? [];
  const chartData = useMemo(
    () => buildContinuousChartData(reportSummaryQuery.data?.chart ?? [], period),
    [period, reportSummaryQuery.data?.chart],
  );
  const salesInsights = useMemo(
    () => generateSalesInsights(
      costBreakdown,
      previousCostBreakdown,
      reportSummaryQuery.data?.hasCurrentData ?? false,
      reportSummaryQuery.data?.hasPreviousData ?? false,
    ),
    [
      costBreakdown,
      previousCostBreakdown,
      reportSummaryQuery.data?.hasCurrentData,
      reportSummaryQuery.data?.hasPreviousData,
    ],
  );

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
    setDebouncedSearchQuery('');
    setSortKey('date');
    setSortDirection('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery.trim()) || sortKey !== 'date' || sortDirection !== 'desc';

  const handleDownload = async () => {
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
    } catch {
      notify('error', 'Laporan gagal dibuat', 'Silakan coba kembali beberapa saat lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const isLoading = reportSummaryQuery.isLoading;
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
          <Button variant="outline" onClick={handleDownload} disabled={isDownloading} className="gap-2">
            <Download size={16} />
            {isDownloading ? 'Menyiapkan...' : 'Download Excel'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
      <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Omzet" value={`Rp ${totalSold.toLocaleString('id-ID')}`} trend={period.mode === 'all' ? undefined : formatPercentDelta(totalSold, previousSold)} isPositive={totalSold >= previousSold} isNeutral={totalSold === previousSold} icon={<TrendingUp size={18} />} iconTone="border-rose-400/35 bg-rose-500/10 text-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.16)]" />
        <MetricCard title="Item Terjual" value={totalItems.toLocaleString('id-ID')} trend={period.mode === 'all' ? undefined : formatNumberDelta(totalItems, previousItems)} isPositive={totalItems >= previousItems} isNeutral={totalItems === previousItems} icon={<Package size={18} />} iconTone="border-sky-400/35 bg-sky-500/10 text-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.16)]" />
        <MetricCard title="Jumlah Pelanggan" value={customerCount.toLocaleString('id-ID')} trend={period.mode === 'all' ? undefined : formatNumberDelta(customerCount, previousCustomers)} isPositive={customerCount >= previousCustomers} isNeutral={customerCount === previousCustomers} icon={<FileText size={18} />} iconTone="border-amber-400/35 bg-amber-500/10 text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.16)]" />
        <MetricCard title="Total Untung" value={`Rp ${totalProfit.toLocaleString('id-ID')}`} trend={period.mode === 'all' ? undefined : formatProfitSignal(totalProfit, previousProfit)} isPositive={totalProfit >= previousProfit} isNeutral={totalProfit === previousProfit} icon={<WalletCards size={18} />} iconTone="border-emerald-400/35 bg-emerald-500/10 text-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.16)]" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:h-[390px] xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="min-h-[320px] xl:min-h-0">
          <ReportChart
            title="Tren Keuntungan"
            subtitle=""
            data={chartData}
            dataKey="profit"
            gradientId="reportProfitFill"
            color="#d6b45d"
          />
        </div>
        <div className="min-h-[360px] xl:min-h-0">
          <CustomerRankingCard title="Top Spend Pelanggan" icon={<Crown size={17} />} data={topBySpend} />
        </div>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-finance-950">Insight Penjualan</h2>
          <p className="mt-1 text-sm text-finance-500">Ringkasan kondisi penjualan periode aktif.</p>
        </div>
        <div className={`grid gap-3 ${salesInsights.length === 1 ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
          {salesInsights.map((insight) => <InsightCard key={insight.key} insight={insight} />)}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-finance-950">Breakdown Biaya</h2>
          <p className="mt-1 text-sm text-finance-500">Estimasi profit setelah modal dan ongkir.</p>
        </div>
        {!reportSummaryQuery.data?.hasCurrentData ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-finance-500">
              Belum ada biaya yang bisa dihitung untuk periode ini.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <BreakdownCard label="Modal Barang" value={formatRupiah(costBreakdown.capitalCost)} />
            <BreakdownCard label="Ongkir Seller" value={formatRupiah(costBreakdown.sellerShippingCost)} />
            <BreakdownCard label="Total Biaya" value={formatRupiah(costBreakdown.totalCost)} />
            <BreakdownCard
              label="Profit Bersih"
              value={formatRupiah(costBreakdown.netProfit)}
              tone={costBreakdown.netProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}
            />
            <BreakdownCard
              label="Margin Bersih"
              value={formatPercentage(costBreakdown.netMargin)}
              tone={costBreakdown.netMargin >= 15 ? 'text-emerald-400' : 'text-amber-300'}
            />
          </div>
        )}
      </section>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-finance-400" />
              <Input
                placeholder="Cari item atau buyer..."
                className="h-10 pl-10"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
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
              <MobileListSkeleton />
            ) : paginatedRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-finance-500">Tidak ada data laporan untuk filter ini.</p>
            ) : (
              <div className="divide-y divide-finance-100">
                {paginatedRows.map((row) => (
                  <div
                    key={row.id}
                    className="w-full rounded-md py-4 text-left transition-colors hover:bg-finance-50"
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
                  </div>
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
                  <TableSkeletonRows columns={6} rows={6} widths={['w-24', 'w-full', 'ml-auto w-12', 'ml-auto w-24', 'ml-auto w-24', 'w-28']} />
                ) : paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-finance-500">Tidak ada transaksi lunas untuk filter ini.</TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow key={row.id}>
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

          {!isTableLoading && (
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
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
