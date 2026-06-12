import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@pokemon-finance/ui';
import InvoicePrint from '../components/InvoicePrint';
import { useTransaction } from '../hooks/useApiQueries';
import { downloadInvoicePdf } from '../lib/invoicePdf';
import { useStore } from '../store/useStore';

export default function InvoicePrintPage() {
  const { id } = useParams();
  const [isDownloading, setIsDownloading] = useState(false);
  const sellerInfo = useStore((state) => state.sellerInfo);
  const transactionQuery = useTransaction(id);
  const transaction = transactionQuery.data;

  const handlePrintInvoice = async () => {
    if (!transaction || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadInvoicePdf({
        transaction,
        sellerInfo,
        filename: `${transaction.invoiceNumber}.pdf`,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (transactionQuery.isLoading) {
    return (
      <main className="premium-dark flex min-h-screen items-center justify-center bg-[#070708] p-6 text-white">
        <p className="text-sm text-finance-500">Memuat invoice...</p>
      </main>
    );
  }

  if (!id || !transaction) {
    return (
      <main className="premium-dark flex min-h-screen items-center justify-center bg-[#070708] p-6 text-white">
        <div className="max-w-sm rounded-lg border border-finance-200 bg-white p-6">
          <h1 className="text-xl font-bold">Invoice tidak ditemukan</h1>
          <p className="mt-2 text-sm text-finance-500">Data transaksi mungkin sudah dihapus.</p>
          <Link
            to="/transactions"
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-accent/70 bg-accent px-4 py-2 text-sm font-medium text-[#080808] transition-colors hover:bg-[#e6c979]"
          >
            Kembali ke transaksi
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="invoice-document-page app-content-scroll h-screen overflow-y-auto bg-[#050505]">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-finance-200 bg-[#0c0c0f] px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">{transaction.invoiceNumber}</p>
          <p className="text-xs text-finance-500">Preview invoice PDF</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.close()}>
            Tutup
          </Button>
          <Button onClick={handlePrintInvoice} disabled={isDownloading}>
            {isDownloading ? 'Menyiapkan PDF...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <div className="mx-auto py-6">
        <InvoicePrint transactionId={transaction.id} visible />
      </div>
    </main>
  );
}
