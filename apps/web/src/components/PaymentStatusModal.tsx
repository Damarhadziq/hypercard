import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CreditCard, X } from 'lucide-react';
import { Button } from '@pokemon-finance/ui';
import type { PaymentMethod, SellerInfo } from '../store/useStore';
import type { UpdateTransactionStatusInput } from '../services/types';
import useAppScrollLock from '../hooks/useAppScrollLock';

export default function PaymentStatusModal({
  open,
  sellerInfo,
  selectedMethod,
  onSelectMethod,
  onClose,
  onConfirm,
  isSubmitting = false,
}: {
  open: boolean;
  sellerInfo: SellerInfo;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  onClose: () => void;
  onConfirm: (input: UpdateTransactionStatusInput) => void;
  isSubmitting?: boolean;
}) {
  useAppScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSubmitting, onClose, open]);

  const buildPaymentInput = (paymentMethod: PaymentMethod): UpdateTransactionStatusInput => ({
    status: 'Lunas',
    paymentMethod,
    mandiriAccountNumber: sellerInfo.bankAccountNumber,
    mandiriAccountHolder: sellerInfo.bankAccountHolder,
    bcaAccountNumber: sellerInfo.bcaAccountNumber,
    bcaAccountHolder: sellerInfo.bcaAccountHolder,
  });

  if (!open) return null;

  return createPortal(
    <div
      className="premium-dark animate-fade-in fixed inset-0 z-[1500] flex items-center justify-center overflow-hidden bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-status-title"
        className="animate-soft-in flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-finance-200 bg-finance-50 shadow-2xl"
      >
        <div className="min-h-0 overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="payment-status-title" className="text-lg font-bold text-finance-950">Tandai transaksi lunas?</h2>
            <p className="mt-1 text-sm text-finance-500">
              Pilih metode pembayaran yang dipakai agar data laporan dan invoice tetap rapi.
            </p>
          </div>
          <button type="button" className="rounded-lg p-1 text-finance-400 hover:bg-finance-100 hover:text-finance-900" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-2">
          {(['Mandiri', 'BCA'] as PaymentMethod[]).map((method) => {
            const accountNumber = method === 'Mandiri' ? sellerInfo.bankAccountNumber : sellerInfo.bcaAccountNumber;
            const active = selectedMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => onSelectMethod(method)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-accent bg-accent/15 text-finance-950'
                    : 'border-finance-200 bg-finance-25 text-finance-700 hover:border-accent/60'
                }`}
              >
                <span>
                  <span className="block font-bold">{method}</span>
                  <span className="mt-0.5 block text-xs text-finance-500">{accountNumber || 'Nomor rekening belum diatur'}</span>
                </span>
                {active ? <CheckCircle2 size={18} className="text-green-500" /> : <CreditCard size={18} className="text-finance-400" />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            onClick={() => onConfirm({ status: 'Lunas' })}
            disabled={isSubmitting}
            className="h-auto min-h-10 whitespace-normal px-3 py-2 text-center leading-5"
          >
            Tandai tanpa metode
          </Button>
          <Button
            onClick={() => onConfirm(buildPaymentInput(selectedMethod))}
            disabled={isSubmitting}
            className="h-auto min-h-10 whitespace-normal px-3 py-2 text-center leading-5"
          >
            Simpan Status Lunas
          </Button>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
