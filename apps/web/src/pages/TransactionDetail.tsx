import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CheckCircle2, Clock, Download, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@pokemon-finance/ui';
import { useFeedback } from '../components/Feedback';
import PaymentStatusModal from '../components/PaymentStatusModal';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { useTransaction, useTransactionMutations } from '../hooks/useApiQueries';
import { downloadInvoicePdf } from '../lib/invoicePdf';
import type { UpdateTransactionStatusInput } from '../services/types';
import { useStore, type PaymentMethod, type Transaction } from '../store/useStore';
import { DetailPageSkeleton } from '../components/LoadingSkeleton';

function getDetailCustomer(transaction: Transaction) {
  return {
    name: transaction.customerName || 'Pembeli',
    phone: transaction.customerPhone ?? '-',
    address: transaction.customerAddress ?? '-',
    postalCode: transaction.customerPostalCode ?? '-',
  };
}

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sellerInfo = useStore((state) => state.sellerInfo);
  const transactionQuery = useTransaction(id);
  const transaction = transactionQuery.data;
  const { updateTransactionStatus, deleteTransaction } = useTransactionMutations();
  const { notify, confirm } = useFeedback();
  const itemPagination = usePagination(transaction?.items ?? [], 10);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(transaction?.paymentMethod ?? 'Mandiri');

  if (transactionQuery.isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!transaction) {
    return (
      <div className="animate-soft-in rounded-lg border border-finance-200 bg-white p-6">
        <h1 className="text-xl font-bold text-finance-950">Transaksi tidak ditemukan</h1>
        <p className="mt-2 text-sm text-finance-500">Data transaksi mungkin sudah dihapus.</p>
        <Button className="mt-5" onClick={() => navigate('/transactions')}>
          Kembali
        </Button>
      </div>
    );
  }

  const customer = getDetailCustomer(transaction);
  const nextStatus = transaction.status === 'Lunas' ? 'Belum Dibayar' : 'Lunas';

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Hapus transaksi?',
      highlightLabel: 'Invoice terkait',
      highlight: transaction.invoiceNumber,
      message: 'Transaksi ini akan dihapus permanen dari daftar transaksi.',
      confirmText: 'Hapus Transaksi',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteTransaction.mutateAsync(transaction.id);
      notify('success', 'Transaksi dihapus', `${transaction.invoiceNumber} sudah dihapus.`);
      navigate('/transactions');
    } catch (error) {
      notify('error', 'Transaksi gagal dihapus', error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus transaksi.');
    }
  };

  const handleStatusUpdate = async () => {
    if (nextStatus === 'Lunas') {
      setSelectedPaymentMethod(transaction.paymentMethod ?? 'Mandiri');
      setShowPaymentModal(true);
      return;
    }
    try {
      await updateTransactionStatus.mutateAsync({ id: transaction.id, input: { status: nextStatus } });
      notify('success', 'Status pembayaran diperbarui', `${transaction.invoiceNumber} sekarang berstatus ${nextStatus}.`);
    } catch (error) {
      notify('error', 'Status gagal diperbarui', error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui status.');
    }
  };

  const confirmPaidStatus = async (input: UpdateTransactionStatusInput) => {
    try {
      await updateTransactionStatus.mutateAsync({ id: transaction.id, input });
      notify('success', 'Status pembayaran diperbarui', `${transaction.invoiceNumber} sekarang berstatus Lunas.`);
      setShowPaymentModal(false);
    } catch (error) {
      notify('error', 'Status gagal diperbarui', error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui status.');
    }
  };

  const handleDownloadInvoice = async () => {
    if (isDownloadingInvoice) return;

    setIsDownloadingInvoice(true);
    try {
      await downloadInvoicePdf({
        transaction,
        sellerInfo,
        filename: `${transaction.invoiceNumber}.pdf`,
      });
      notify('success', 'PDF berhasil diunduh', `${transaction.invoiceNumber} sudah dibuat.`);
    } catch (error) {
      notify('error', 'PDF gagal dibuat', error instanceof Error ? error.message : 'Terjadi kesalahan saat membuat PDF.');
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  return (
    <div className="animate-soft-in space-y-4">
      <PaymentStatusModal
        open={showPaymentModal}
        sellerInfo={sellerInfo}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setSelectedPaymentMethod}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={confirmPaidStatus}
        isSubmitting={updateTransactionStatus.isPending}
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link to="/transactions" className="inline-flex items-center gap-2 text-sm font-semibold text-finance-500 transition-colors hover:text-finance-900">
            <ArrowLeft size={16} />
            Kembali ke transaksi
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-finance-950">{transaction.invoiceNumber}</h1>
          <p className="mt-1 text-sm text-finance-500">{format(new Date(transaction.date), 'dd MMM yyyy, HH:mm')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="outline" onClick={handleDownloadInvoice} disabled={isDownloadingInvoice} className="gap-2 whitespace-nowrap">
            <Download size={16} />
            {isDownloadingInvoice ? 'Menyiapkan PDF...' : 'Download PDF'}
          </Button>
          <Button
            variant="outline"
            onClick={handleStatusUpdate}
            className={`gap-2 whitespace-nowrap border ${
              transaction.status === 'Lunas'
                ? 'border-accent/35 bg-accent/10 text-accent hover:bg-accent/15'
                : 'border-green-500/25 bg-green-500/10 text-green-600 hover:bg-green-500/15'
            }`}
          >
            {transaction.status === 'Lunas' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
            <span className="whitespace-nowrap">{`Tandai ${nextStatus}`}</span>
          </Button>
          <Button variant="destructive" onClick={handleDelete} className="gap-2">
            <Trash2 size={16} />
            Hapus
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="animate-soft-in lg:col-span-2">
          <CardHeader className="p-4">
            <CardTitle>Produk Dibeli</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="-mx-1 overflow-x-auto pb-1">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-10 px-3">Produk</TableHead>
                    <TableHead className="h-10 px-3 text-right">Harga</TableHead>
                    <TableHead className="h-10 px-3 text-right">Qty</TableHead>
                    <TableHead className="h-10 px-3 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemPagination.paginatedItems.map((item) => {
                    const productName = item.productName || 'Produk';
                    const productMeta = item.productCondition || item.productSetName || '-';
                    return (
                      <TableRow key={item.productId}>
                        <TableCell className="p-3">
                          <p className="font-semibold text-finance-950">{productName}</p>
                          <p className="mt-1 text-xs text-finance-500">{productMeta}</p>
                        </TableCell>
                        <TableCell className="p-3 text-right">Rp {item.price.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="p-3 text-right">{item.quantity}</TableCell>
                        <TableCell className="p-3 text-right font-semibold">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={itemPagination.page}
              pageSize={itemPagination.pageSize}
              totalItems={transaction.items.length}
              totalPages={itemPagination.totalPages}
              onPageChange={itemPagination.setPage}
              onPageSizeChange={itemPagination.setPageSize}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="animate-soft-in">
            <CardHeader className="p-4">
              <CardTitle>Informasi Pembeli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 p-4 pt-0 text-sm">
              <div>
                <p className="text-finance-400">Nama</p>
                <p className="mt-1 font-semibold text-finance-950">{customer.name}</p>
              </div>
              <div>
                <p className="text-finance-400">Kontak</p>
                <p className="mt-1 font-semibold text-finance-950">{customer.phone}</p>
              </div>
              <div>
                <p className="text-finance-400">Alamat</p>
                <p className="mt-1 font-semibold text-finance-950">{customer.address}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-soft-in">
            <CardHeader className="p-4">
              <CardTitle>Ringkasan Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-finance-500">Subtotal</span>
                <span className="font-medium">Rp {transaction.subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-finance-500">Ongkir</span>
                <span className="font-medium">Rp {(transaction.shippingCost ?? 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between border-t border-finance-100 pt-3">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-primary">Rp {transaction.total.toLocaleString('id-ID')}</span>
              </div>
              <span className={`inline-flex rounded-md border px-3 py-1.5 text-xs font-bold ${transaction.status === 'Lunas' ? 'border-green-500/25 bg-green-500/15 text-green-600' : 'border-accent/30 bg-accent/10 text-accent'}`}>
                {transaction.status}
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
