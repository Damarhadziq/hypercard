import { Minus, Plus } from 'lucide-react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  required?: boolean;
}

const quickAmounts = [10_000, 50_000, 100_000];

function formatInputValue(value: number) {
  return value > 0 ? value.toLocaleString('id-ID') : '';
}

export default function CurrencyInput({ value, onChange, label, required = false }: CurrencyInputProps) {
  const updateValue = (nextValue: number) => onChange(Math.max(0, Math.round(nextValue)));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-primary">*</span>}
      </label>

      <div className="overflow-hidden rounded-lg border border-finance-200 bg-white transition-colors focus-within:border-finance-950">
        <div className="flex h-12 items-center">
          <span className="flex h-full items-center border-r border-finance-100 bg-finance-50 px-3 text-sm font-bold text-finance-600">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={formatInputValue(value)}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
              updateValue(digits ? Number(digits) : 0);
            }}
            placeholder="0"
            className="h-full min-w-0 flex-1 px-3 text-lg font-bold text-finance-950 placeholder:text-finance-500"
            aria-label={label}
          />
          <div className="flex h-full shrink-0 border-l border-finance-100">
            <button
              type="button"
              onClick={() => updateValue(value - 10_000)}
              className="flex w-10 items-center justify-center text-finance-500 hover:bg-finance-100 hover:text-finance-950"
              aria-label={`Kurangi ${label} Rp 10.000`}
              title="Kurangi Rp 10.000"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={() => updateValue(value + 10_000)}
              className="flex w-10 items-center justify-center border-l border-finance-100 text-finance-500 hover:bg-finance-100 hover:text-finance-950"
              aria-label={`Tambah ${label} Rp 10.000`}
              title="Tambah Rp 10.000"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => updateValue(value + amount)}
            className="rounded-md border border-finance-200 bg-white px-2 py-1 text-[11px] font-semibold text-finance-600 transition-colors hover:border-finance-300 hover:bg-finance-50 hover:text-finance-950 active:bg-finance-100"
          >
            +{amount / 1000} rb
          </button>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => updateValue(0)}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-red-50"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
