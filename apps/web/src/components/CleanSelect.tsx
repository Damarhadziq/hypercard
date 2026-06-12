import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface CleanSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface CleanSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CleanSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default function CleanSelect({ value, onChange, options, placeholder = 'Pilih opsi', searchable = false, searchPlaceholder = 'Cari...' }: CleanSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(320);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(
    () => {
      const normalizedQuery = normalizeSearchText(query);
      return options.filter((option) => [
        option.label,
        option.value,
        option.description,
        option.badge,
      ].some((value) => normalizeSearchText(value ?? '').includes(normalizedQuery)));
    },
    [options, query],
  );

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePlacement = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportMargin = 16;
      const drawer = buttonRef.current?.closest('aside');
      const stickyFooter = drawer?.querySelector<HTMLElement>('.sticky.bottom-0');
      const stickyFooterTop = stickyFooter?.getBoundingClientRect().top;
      const visibleBottom = stickyFooterTop && stickyFooterTop < window.innerHeight
        ? stickyFooterTop
        : window.innerHeight;
      const availableBelow = visibleBottom - rect.bottom - viewportMargin;
      const availableAbove = rect.top - viewportMargin;
      const idealHeight = 320;
      const minUsefulHeight = 180;
      const nextPlacement = availableBelow < minUsefulHeight && availableAbove > availableBelow ? 'top' : 'bottom';
      const availableSpace = nextPlacement === 'top' ? availableAbove : availableBelow;
      const nextHeight = Math.max(140, Math.min(idealHeight, availableSpace));

      setPlacement(nextPlacement);
      setDropdownMaxHeight(nextHeight);
      setDropdownPosition({
        left: rect.left,
        top: nextPlacement === 'top' ? rect.top - nextHeight - 8 : rect.bottom + 8,
        width: rect.width,
      });
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [isOpen, query]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => {
          setIsOpen((current) => {
            const nextOpen = !current;
            setIsSearchFocused(nextOpen);
            return nextOpen;
          });
          setQuery('');
        }}
        className="select-trigger flex h-11 w-full select-none items-center justify-between gap-3 rounded-md border border-finance-200 bg-white px-3 py-2 text-left text-sm shadow-none transition-colors duration-200 hover:border-finance-300 focus:outline-none"
      >
        <span className={`min-w-0 truncate ${selectedOption ? 'text-finance-950' : 'text-finance-400'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-finance-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          style={{
            left: dropdownPosition.left,
            top: dropdownPosition.top,
            width: dropdownPosition.width,
            minWidth: dropdownPosition.width,
            maxWidth: dropdownPosition.width,
            maxHeight: dropdownMaxHeight,
            transformOrigin: placement === 'top' ? 'bottom center' : 'top center',
          }}
          className="dropdown-surface premium-dark animate-dropdown-in fixed z-[1400] box-border flex min-h-0 flex-col overflow-hidden rounded-lg border bg-[#0c0c0f] p-1 shadow-xl"
        >
          {searchable && (
            <div className="relative m-1 mb-2">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-finance-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                data-focused={isSearchFocused}
                placeholder={searchPlaceholder}
                className="dropdown-search h-10 w-full rounded-md border border-finance-200 bg-finance-50 pl-9 pr-3 text-sm text-finance-950 placeholder:text-finance-400"
              />
            </div>
          )}
          <div ref={listRef} className="styled-scrollbar min-h-0 flex-1 overflow-y-auto">
          {filteredOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                onClick={() => {
                  if (option.disabled) return;
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full select-none items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors active:bg-finance-100 ${
                  isSelected ? 'bg-finance-100 text-finance-950' : 'text-finance-700 hover:bg-finance-50'
                } ${option.disabled ? 'cursor-not-allowed opacity-45' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.label}</span>
                  {option.description && <span className="mt-0.5 block truncate text-xs text-finance-500">{option.description}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {option.badge && (
                    <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                      {option.badge}
                    </span>
                  )}
                  {isSelected && <Check size={15} className="shrink-0 text-primary" />}
                </span>
              </button>
            );
          })}
          {filteredOptions.length === 0 && <p className="px-3 py-6 text-center text-sm text-finance-500">Tidak ada hasil.</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
