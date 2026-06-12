import { CheckCircle2, CreditCard, X } from 'lucide-react';
import { Button } from '@pokemon-finance/ui';
import type { PaymentMethod, SellerInfo } from '../store/useStore';
import type { UpdateTransactionStatusInput } from '../services/types';

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
  if (!open) return null;

  const buildPaymentInput = (paymentMethod: PaymentMethod): UpdateTransactionStatusInput => ({
    status: 'Lunas',
    paymentMethod,
    mandiriAccountNumber: sellerInfo.bankAccountNumber,
    mandiriAccountHolder: sellerInfo.bankAccountHolder,
    bcaAccountNumber: sellerInfo.bcaAccountNumber,
    bcaAccountHolder: sellerInfo.bcaAccountHolder,
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="animate-soft-in w-full max-w-md rounded-xl border border-finance-200 bg-finance-50 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-finance-950">Tandai transaksi lunas?</h2>
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

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button
            variant="outline"
            onClick={() => onConfirm({ status: 'Lunas' })}
            disabled={isSubmitting}
          >
            Tandai Lunas Tanpa Metode
          </Button>
          <Button onClick={() => onConfirm(buildPaymentInput(selectedMethod))} disabled={isSubmitting} className="sm:min-w-52">
            Simpan Status Lunas
          </Button>
        </div>
      </div>
    </div>
  );
}
