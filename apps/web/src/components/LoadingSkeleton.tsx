import { TableCell, TableRow } from '@pokemon-finance/ui';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`app-skeleton rounded-md ${className}`} aria-hidden="true" />;
}

export function TableSkeletonRows({
  columns,
  rows = 6,
  widths,
}: {
  columns: number;
  rows?: number;
  widths?: string[];
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={rowIndex} aria-hidden="true">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className={`h-4 ${widths?.[columnIndex] ?? 'w-full'}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function MobileListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-finance-100" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="space-y-3 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 pt-3" role="status" aria-label="Memuat dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-finance-200 bg-finance-50 p-6">
            <div className="flex items-start justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
            <Skeleton className="mt-8 h-7 w-3/5" />
            <Skeleton className="mt-3 h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-finance-200 bg-finance-50 p-6 lg:col-span-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-6 h-[280px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-finance-200 bg-finance-50 p-6">
          <Skeleton className="h-5 w-36" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" role="status" aria-label="Memuat produk">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-finance-200 bg-finance-50">
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InvoiceFormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3" role="status" aria-label="Memuat form invoice">
      <div className="rounded-xl border border-finance-200 bg-finance-50 p-6 xl:col-span-2">
        <Skeleton className="h-5 w-44" />
        <div className="mt-7 space-y-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-11 w-full" />
          <div className="border-t border-finance-100 pt-5">
            <Skeleton className="h-3 w-24" />
            <div className="mt-3 flex gap-3">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 w-24" />
            </div>
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
      <div className="rounded-xl border border-finance-200 bg-finance-50 p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-7 space-y-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex justify-between gap-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Memuat detail transaksi">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-finance-200 bg-finance-50 lg:col-span-2">
          <div className="border-b border-finance-200 p-5"><Skeleton className="h-5 w-32" /></div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-4 border-b border-finance-200 pb-4">
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}
            </div>
            <div className="space-y-5 py-5">
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-5 w-full" />)}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, cardIndex) => (
            <div key={cardIndex} className="rounded-xl border border-finance-200 bg-finance-50 p-5">
              <Skeleton className="h-5 w-36" />
              <div className="mt-6 space-y-4">
                {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-4 w-full" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
