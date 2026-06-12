/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@pokemon-finance/ui';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  exiting?: boolean;
}

interface ConfirmOptions {
  title: string;
  message: string;
  highlight?: string;
  highlightLabel?: string;
  confirmText?: string;
  danger?: boolean;
}

interface FeedbackContextValue {
  notify: (type: ToastType, title: string, message?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmation, setConfirmation] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => (
      toast.id === id ? { ...toast, exiting: true } : toast
    )));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 180);
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts((current) => {
      if (current.length === 0) return current;
      current.forEach((toast) => {
        window.setTimeout(() => {
          setToasts((latest) => latest.filter((item) => item.id !== toast.id));
        }, 180);
      });
      return current.map((toast) => ({ ...toast, exiting: true }));
    });
  }, []);

  useEffect(() => {
    window.addEventListener('pointerdown', dismissAllToasts, true);
    return () => window.removeEventListener('pointerdown', dismissAllToasts, true);
  }, [dismissAllToasts]);

  const notify = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, type, title, message }]);
    window.setTimeout(() => {
      dismissToast(id);
    }, 2200);
  }, [dismissToast]);

  const confirm = useCallback((options: ConfirmOptions) => (
    new Promise<boolean>((resolve) => setConfirmation({ ...options, resolve }))
  ), []);

  const value = useMemo(() => ({ notify, confirm }), [confirm, notify]);

  const closeConfirmation = (result: boolean) => {
    confirmation?.resolve(result);
    setConfirmation(null);
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {createPortal(
        <>
          <div className="premium-dark pointer-events-none fixed right-4 top-4 z-[1300] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
            {toasts.map((toast) => {
              const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertCircle : Info;
              const iconClass = toast.type === 'success' ? 'text-green-600' : toast.type === 'error' ? 'text-primary' : 'text-finance-600';
              return (
                <div key={toast.id} className={`pointer-events-auto flex gap-3 rounded-lg border border-finance-200 bg-white p-4 shadow-xl ${toast.exiting ? 'animate-toast-out' : 'animate-toast-in'}`}>
                  <Icon size={20} className={`mt-0.5 shrink-0 ${iconClass}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-finance-950">{toast.title}</p>
                    {toast.message && <p className="mt-1 text-sm leading-5 text-finance-500">{toast.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-finance-400 hover:bg-finance-100 hover:text-finance-900"
                    aria-label="Tutup notifikasi"
                  >
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          {confirmation && (
            <div className="premium-dark animate-fade-in fixed inset-0 z-[1250] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
              <div role="dialog" aria-modal="true" className="animate-soft-in w-full max-w-sm rounded-lg border border-finance-200 bg-white p-5 shadow-xl">
                <h3 className="text-lg font-bold text-finance-950">{confirmation.title}</h3>
                {confirmation.highlight && (
                  <div className={`mt-3 rounded-md border px-3 py-2.5 ${
                    confirmation.danger
                      ? 'border-primary/35 bg-primary/10'
                      : 'border-accent/35 bg-accent/10'
                  }`}>
                    <p className={`text-[10px] font-bold tracking-wider ${
                      confirmation.danger ? 'text-primary' : 'text-accent'
                    }`}>
                      {confirmation.highlightLabel || 'Data dipilih'}
                    </p>
                    <p className="mt-1 break-words text-sm font-extrabold text-finance-950">
                      {confirmation.highlight}
                    </p>
                  </div>
                )}
                <p className="mt-2 text-sm leading-6 text-finance-500">{confirmation.message}</p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => closeConfirmation(false)}>Batal</Button>
                  <Button variant={confirmation.danger ? 'destructive' : 'default'} onClick={() => closeConfirmation(true)}>
                    {confirmation.confirmText || 'Konfirmasi'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body,
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback harus digunakan di dalam FeedbackProvider');
  return context;
}
