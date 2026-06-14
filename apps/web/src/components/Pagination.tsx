import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const pageSizeOptions = [5, 10, 20, 50];

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const pageSizeButtonRef = useRef<HTMLButtonElement>(null);
  const start = totalItems === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const end = Math.min(page * pageSize, totalItems);
  const hasPageControls = totalItems > pageSize;

  useLayoutEffect(() => {
    if (!isPageSizeOpen) return;

    const updateMenuPosition = () => {
      const rect = pageSizeButtonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuHeight = (pageSizeOptions.length * 32) + 8;
      setMenuPosition({
        left: rect.left,
        top: Math.max(8, rect.top - menuHeight - 6),
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isPageSizeOpen]);

  return (
    <div className="flex flex-col gap-3 border-t border-finance-100 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-finance-500">
        <span>Tampilkan</span>
        <div className="relative">
          <button
            ref={pageSizeButtonRef}
            type="button"
            onClick={() => setIsPageSizeOpen((value) => !value)}
            className="dropdown-trigger flex h-9 min-w-[70px] items-center justify-between gap-2 rounded-md border border-finance-200 bg-white px-3 text-sm font-semibold text-finance-900 transition-colors hover:border-finance-300 focus:outline-none"
            aria-haspopup="listbox"
            aria-expanded={isPageSizeOpen}
            aria-label="Jumlah data per halaman"
          >
            <span>{pageSize}</span>
            <ChevronDown size={15} className={`text-finance-500 transition-transform ${isPageSizeOpen ? 'rotate-180' : ''}`} />
          </button>
          {isPageSizeOpen && createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsPageSizeOpen(false)}
                aria-label="Tutup pilihan jumlah data"
              />
              <div
                role="listbox"
                style={{ left: menuPosition.left, top: menuPosition.top }}
                className="dropdown-surface premium-dark animate-dropdown-up-in fixed z-[1400] w-[86px] overflow-hidden rounded-lg border border-finance-200 bg-[#0c0c0f] p-1 shadow-xl"
              >
                {pageSizeOptions.map((size) => {
                  const selected = pageSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        onPageSizeChange(size);
                        setIsPageSizeOpen(false);
                      }}
                      className={`flex h-8 w-full items-center justify-between rounded-md px-2.5 text-sm font-semibold transition-colors ${
                        selected ? 'bg-finance-100 text-finance-950' : 'text-finance-600 hover:bg-finance-50 hover:text-finance-950'
                      }`}
                    >
                      <span>{size}</span>
                      {selected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body,
          )}
        </div>
        <span>data</span>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-sm text-finance-500">{start}-{end} dari {totalItems}</span>
        {hasPageControls && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-finance-200 text-finance-600 hover:bg-finance-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="min-w-20 text-center text-sm font-semibold text-finance-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-finance-200 text-finance-600 hover:bg-finance-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
