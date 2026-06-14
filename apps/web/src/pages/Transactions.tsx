import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@pokemon-finance/ui';
import { Search, FileText, CheckCircle2, Clock, PlusCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { useFeedback } from '../components/Feedback';
import Pagination from '../components/Pagination';
import PaymentStatusModal from '../components/PaymentStatusModal';
import SideDrawer from '../components/SideDrawer';
import CleanSelect from '../components/CleanSelect';
import CurrencyInput from '../components/CurrencyInput';
import PokemonCardPicker from '../components/PokemonCardPicker';
import { useCustomers, useProductMutations, useTransactionMutations, useTransactions } from '../hooks/useApiQueries';
import useClampedPage from '../hooks/useClampedPage';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { rarityOptions } from '../lib/rarity';
import type { PokemonTcgCard } from '../lib/pokemonTcg';
import type { TransactionSort, TransactionStatusFilter } from '../services/transactions';
import type { UpdateTransactionStatusInput } from '../services/types';
import { useStore, type PaymentMethod, type Transaction } from '../store/useStore';

function getListCustomer(transaction: Transaction) {
  return {
    name: transaction.customerName || 'Pembeli',
    phone: transaction.customerPhone ?? '-',
    address: transaction.customerAddress ?? '-',
    postalCode: transaction.customerPostalCode ?? '-',
  };
}

function isRecentlyCreated(transaction: Transaction) {
  const createdAt = transaction.createdAt ? new Date(transaction.createdAt).getTime() : 0;
  return createdAt > 0 && Date.now() - createdAt <= 10 * 1000;
}

const emptyManualTransaction = {
  customerId: '',
  cardName: '',
  setName: '',
  cardNumber: '',
  image: '',
  condition: 'Near Mint',
  rarity: '',
  buyPrice: 0,
  sellPrice: 0,
  quantity: 1,
  status: 'Belum Dibayar' as 'Lunas' | 'Belum Dibayar',
  paymentMethod: 'Mandiri' as PaymentMethod,
};

type ManualTransactionForm = typeof emptyManualTransaction;

const conditionOptions = [
  'Mint', 'Near Mint', 'Excellent', 'Good', 'Played', 'Damaged',
];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const transactionSortOptions: Array<{ value: TransactionSort; label: string }> = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'price-asc', label: 'Harga terendah' },
  { value: 'price-desc', label: 'Harga tertinggi' },
];
const transactionStatusOptions: Array<{ value: TransactionStatusFilter; label: string }> = [
  { value: 'all', label: 'Semua status' },
  { value: 'Lunas', label: 'Lunas' },
  { value: 'Belum Dibayar', label: 'Belum Dibayar' },
];

function ManualTransactionDrawer({
  form,
  customers,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
  onBeforeClose,
}: {
  form: ManualTransactionForm;
  customers: Array<{ id: string; name: string }>;
  isSubmitting: boolean;
  onChange: (updater: (current: ManualTransactionForm) => ManualTransactionForm) => void;
  onClose: () => void;
  onSubmit: () => void;
  onBeforeClose: () => boolean | Promise<boolean>;
}) {
  const customerOptions = [
    { value: '', label: 'Pilih pembeli', disabled: true },
    ...customers.map((customer) => ({ value: customer.id, label: customer.name })),
  ];

  const handleSelectCard = (card: PokemonTcgCard) => {
    onChange((current) => ({
      ...current,
      cardName: card.name,
      setName: card.set.name,
      cardNumber: card.number,
      image: card.images.small,
    }));
  };

  return (
    <SideDrawer onClose={onClose} onBeforeClose={onBeforeClose} widthClassName="md:max-w-3xl">
      {(requestClose) => (
        <div className="flex min-h-full flex-col">
          <div className="side-drawer-header sticky top-0 z-10 bg-finance-50/95 px-6 py-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-finance-950">Tambah Transaksi</h2>
                <p className="mt-1 text-sm text-finance-500">Catat penjualan langsung tanpa membuat invoice terlebih dahulu.</p>
              </div>
              <button type="button" className="rounded-lg p-1 text-finance-400 hover:bg-finance-100 hover:text-finance-900" onClick={requestClose} aria-label="Tutup">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 px-6 py-6">
            <div className="rounded-lg border border-finance-200 bg-finance-25 p-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-finance-950">Informasi Transaksi</h3>
                <p className="mt-1 text-sm text-finance-500">Isi detail kartu, harga modal, dan harga jual untuk langsung masuk ke daftar transaksi.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-finance-700">Pembeli</label>
                  <CleanSelect
                    value={form.customerId}
                    onChange={(value) => onChange((current) => ({ ...current, customerId: value }))}
                    options={customerOptions}
                    placeholder="Pilih pembeli"
                    searchable
                    searchPlaceholder="Cari nama pembeli..."
                  />
                </div>

                <div className="space-y-2 border-t border-finance-100 pt-4">
                  <label className="text-sm font-medium text-finance-700">Pilih Kartu Pokemon</label>
                  <PokemonCardPicker
                    currentName={form.cardName}
                    currentSet={form.setName}
                    currentImage={form.image}
                    onSelect={handleSelectCard}
                  />
                </div>

                <div className="grid gap-4 border-t border-finance-100 pt-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-finance-700">Kondisi</label>
                    <CleanSelect
                      value={form.condition}
                      onChange={(value) => onChange((current) => ({ ...current, condition: value }))}
                      options={conditionOptions.map((value) => ({ value, label: value }))}
                      placeholder="Pilih kondisi"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-finance-700">Rarity</label>
                    <CleanSelect
                      value={form.rarity}
                      onChange={(value) => onChange((current) => ({ ...current, rarity: value }))}
                      options={rarityOptions.map((option) => ({ ...option }))}
                      placeholder="Pilih rarity"
                      searchable
                      searchPlaceholder="Cari kode atau nama rarity..."
                    />
                  </div>

                  <CurrencyInput
                    label="Modal per Kartu"
                    value={form.buyPrice}
                    onChange={(value) => onChange((current) => ({ ...current, buyPrice: value }))}
                  />
                  <CurrencyInput
                    label="Harga Jual per Kartu"
                    value={form.sellPrice}
                    onChange={(value) => onChange((current) => ({ ...current, sellPrice: value }))}
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-finance-700">Qty</label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-11 shrink-0 px-0"
                        onClick={() => onChange((current) => ({ ...current, quantity: Math.max(1, current.quantity - 1) }))}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={form.quantity}
                        onChange={(event) => onChange((current) => ({ ...current, quantity: Math.max(1, Number(event.target.value) || 1) }))}
                        className="h-11 text-center text-base font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-11 shrink-0 px-0"
                        onClick={() => onChange((current) => ({ ...current, quantity: current.quantity + 1 }))}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-finance-700">Status</label>
                    <CleanSelect
                    value={form.status}
                    onChange={(value) => onChange((current) => ({ ...current, status: value as 'Lunas' | 'Belum Dibayar' }))}
                    options={[
                      { value: 'Belum Dibayar', label: 'Belum Dibayar' },
                      { value: 'Lunas', label: 'Lunas' },
                    ]}
                    placeholder="Pilih status"
                  />
                  </div>

                  {form.status === 'Lunas' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium text-finance-700">Metode Pembayaran</label>
                      <CleanSelect
                      value={form.paymentMethod}
                      onChange={(value) => onChange((current) => ({ ...current, paymentMethod: value as PaymentMethod }))}
                      options={[
                        { value: 'Mandiri', label: 'Mandiri', description: 'Gunakan rekening Mandiri' },
                        { value: 'BCA', label: 'BCA', description: 'Gunakan rekening BCA' },
                      ]}
                      placeholder="Pilih metode pembayaran"
                    />
                    </div>
                  )}

                  {(form.buyPrice || form.sellPrice) ? (
                    <div className="grid grid-cols-2 gap-3 rounded-lg bg-finance-50 p-3 sm:col-span-2">
                      <div>
                        <p className="text-xs font-medium text-finance-500">Margin per kartu</p>
                        <p className={`mt-1 text-base font-bold ${form.sellPrice >= form.buyPrice ? 'text-green-700' : 'text-primary'}`}>
                          Rp {(form.sellPrice - form.buyPrice).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-finance-500">Persentase margin</p>
                        <p className={`mt-1 text-base font-bold ${form.sellPrice >= form.buyPrice ? 'text-green-700' : 'text-primary'}`}>
                          {form.buyPrice ? `${(((form.sellPrice - form.buyPrice) / form.buyPrice) * 100).toFixed(1)}%` : '0%'}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-finance-200 bg-finance-50/95 px-6 py-4 backdrop-blur">
            <div className="flex justify-end gap-2">
              <Button onClick={onSubmit} disabled={isSubmitting}>
                Simpan Transaksi
              </Button>
            </div>
          </div>
        </div>
      )}
    </SideDrawer>
  );
}

export default function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<TransactionSort>('newest');
  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>('all');
  const customersQuery = useCustomers({ limit: 1000 });
  const transactionsQuery = useTransactions({
    search: debouncedSearchQuery || undefined,
    page,
    limit: pageSize,
    sort,
    status: statusFilter,
  });
  const transactions = transactionsQuery.data?.data ?? EMPTY_TRANSACTIONS;
  const totalItems = transactionsQuery.data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const { updateTransactionStatus } = useTransactionMutations();
  const { createTransaction } = useTransactionMutations();
  const { createProduct } = useProductMutations();
  const sellerInfo = useStore((state) => state.sellerInfo);
  const navigate = useNavigate();
  const location = useLocation();
  const newTransactionId = (location.state as { newTransactionId?: string } | null)?.newTransactionId;
  const [highlightedTransactionIds, setHighlightedTransactionIds] = useState<Set<string>>(() => new Set());
  const [paymentModalTransactionId, setPaymentModalTransactionId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Mandiri');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState(emptyManualTransaction);
  const { notify, confirm } = useFeedback();
  const customers = customersQuery.data?.data ?? [];

  useClampedPage(page, totalPages, setPage, !transactionsQuery.isFetching);

  useEffect(() => {
    const ids = transactions
      .filter((transaction) => transaction.id === newTransactionId || isRecentlyCreated(transaction))
      .map((transaction) => transaction.id);

    if (ids.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      setHighlightedTransactionIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.add(id));
        return next;
      });
    });

    const timer = window.setTimeout(() => {
      setHighlightedTransactionIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 6500);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [newTransactionId, transactions]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Lunas' ? 'Belum Dibayar' : 'Lunas';
    if (nextStatus === 'Lunas') {
      setPaymentModalTransactionId(id);
      return;
    }
    try {
      await updateTransactionStatus.mutateAsync({ id, input: { status: nextStatus } });
      notify('success', 'Status pembayaran diperbarui', `Transaksi sekarang berstatus ${nextStatus}.`);
    } catch (error) {
      notify('error', 'Status gagal diperbarui', error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui status.');
    }
  };

  const confirmPaidStatus = async (input: UpdateTransactionStatusInput) => {
    if (!paymentModalTransactionId) return;
    try {
      await updateTransactionStatus.mutateAsync({ id: paymentModalTransactionId, input });
      notify('success', 'Status pembayaran diperbarui', 'Transaksi sekarang berstatus Lunas.');
      setPaymentModalTransactionId(null);
    } catch (error) {
      notify('error', 'Status gagal diperbarui', error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui status.');
    }
  };

  const resetManualForm = () => {
    setManualForm({
      ...emptyManualTransaction,
      customerId: customers[0]?.id ?? '',
    });
  };

  const isManualFormDirty = Boolean(
    manualForm.cardName.trim()
      || manualForm.setName.trim()
      || manualForm.cardNumber.trim()
      || manualForm.image
      || manualForm.rarity
      || manualForm.buyPrice
      || manualForm.sellPrice
      || manualForm.quantity !== 1
      || manualForm.condition !== 'Near Mint'
      || manualForm.status !== 'Belum Dibayar'
      || manualForm.paymentMethod !== 'Mandiri',
  );
  const canCloseManualTransaction = async () => {
    if (!isManualFormDirty) return true;
    return confirm({
      title: 'Batalkan tambah transaksi?',
      highlightLabel: 'Draft transaksi',
      highlight: manualForm.cardName.trim() || 'Transaksi baru',
      message: 'Data transaksi yang sudah diisi belum disimpan dan akan hilang.',
      confirmText: 'Tetap Batalkan',
      danger: true,
    });
  };
  const closeManualTransaction = () => {
    setIsManualModalOpen(false);
    resetManualForm();
  };

  const openManualTransactionModal = () => {
    setManualForm((current) => ({
      ...current,
      customerId: current.customerId || customers[0]?.id || '',
    }));
    setIsManualModalOpen(true);
  };

  const handleCreateManualTransaction = async () => {
    const quantity = Math.max(1, manualForm.quantity || 1);
    const buyPrice = Math.max(0, manualForm.buyPrice || 0);
    const sellPrice = Math.max(0, manualForm.sellPrice || 0);

    if (!manualForm.customerId) {
      notify('error', 'Pembeli belum dipilih', 'Pilih pembeli sebelum menyimpan transaksi.');
      return;
    }
    if (!manualForm.cardName.trim()) {
      notify('error', 'Nama kartu belum diisi', 'Isi nama kartu yang dijual.');
      return;
    }
    if (sellPrice <= 0) {
      notify('error', 'Harga jual belum valid', 'Isi harga jual kartu terlebih dahulu.');
      return;
    }

    try {
      const product = await createProduct.mutateAsync({
        name: manualForm.cardName.trim(),
        category: 'Single Card',
        condition: manualForm.condition,
        setName: manualForm.setName.trim() || undefined,
        rarity: manualForm.rarity.trim() || undefined,
        language: 'English',
        cardNumber: manualForm.cardNumber.trim() || undefined,
        buyPrice,
        sellPrice,
        stock: quantity,
        image: manualForm.image || undefined,
        notes: 'Produk dibuat otomatis dari tambah transaksi.',
      });

      let transaction = await createTransaction.mutateAsync({
        customerId: manualForm.customerId,
        items: [{ productId: product.id, quantity, price: sellPrice }],
        subtotal: sellPrice * quantity,
        shippingCost: 0,
        total: sellPrice * quantity,
        paymentMethod: manualForm.paymentMethod,
        mandiriAccountNumber: sellerInfo.bankAccountNumber,
        mandiriAccountHolder: sellerInfo.bankAccountHolder,
        bcaAccountNumber: sellerInfo.bcaAccountNumber,
        bcaAccountHolder: sellerInfo.bcaAccountHolder,
        notes: 'Transaksi dibuat langsung tanpa form invoice.',
        date: new Date().toISOString(),
      });

      if (manualForm.status === 'Lunas') {
        transaction = await updateTransactionStatus.mutateAsync({
          id: transaction.id,
          input: {
            status: 'Lunas',
            paymentMethod: manualForm.paymentMethod,
            mandiriAccountNumber: sellerInfo.bankAccountNumber,
            mandiriAccountHolder: sellerInfo.bankAccountHolder,
            bcaAccountNumber: sellerInfo.bcaAccountNumber,
            bcaAccountHolder: sellerInfo.bcaAccountHolder,
          },
        });
      }

      notify('success', 'Transaksi ditambahkan', `${transaction.invoiceNumber} masuk ke daftar transaksi.`);
      setIsManualModalOpen(false);
      resetManualForm();
      setSearchQuery('');
      setPage(1);
    } catch (error) {
      notify('error', 'Transaksi gagal dibuat', error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan transaksi.');
    }
  };

  return (
    <div className="space-y-6">
      <PaymentStatusModal
        open={Boolean(paymentModalTransactionId)}
        sellerInfo={sellerInfo}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setSelectedPaymentMethod}
        onClose={() => setPaymentModalTransactionId(null)}
        onConfirm={confirmPaidStatus}
        isSubmitting={updateTransactionStatus.isPending}
      />
      {isManualModalOpen && (
        <ManualTransactionDrawer
          form={manualForm}
          customers={customers}
          isSubmitting={createProduct.isPending || createTransaction.isPending || updateTransactionStatus.isPending}
          onChange={setManualForm}
          onClose={closeManualTransaction}
          onBeforeClose={canCloseManualTransaction}
          onSubmit={handleCreateManualTransaction}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-finance-950">Daftar Transaksi</h1>
          <p className="text-sm text-finance-500 mt-1">Pantau semua transaksi dan status pembayaran pelanggan.</p>
        </div>
        <Button onClick={openManualTransactionModal} className="gap-2">
          <PlusCircle size={16} />
          Tambah Transaksi
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-finance-400" />
              <Input 
                placeholder="Cari no invoice atau nama pembeli..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[420px]">
              <CleanSelect
                value={sort}
                onChange={(value) => {
                  setSort(value as TransactionSort);
                  setPage(1);
                }}
                options={transactionSortOptions}
                placeholder="Urutkan"
              />
              <CleanSelect
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as TransactionStatusFilter);
                  setPage(1);
                }}
                options={transactionStatusOptions}
                placeholder="Status pembayaran"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="md:hidden">
              {transactionsQuery.isLoading ? (
                <p className="py-8 text-center text-sm text-finance-500">Memuat transaksi...</p>
              ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-finance-500">Tidak ada transaksi ditemukan.</p>
            ) : (
              <div className="divide-y divide-finance-100">
                {transactions.map((trx) => {
                  const customer = getListCustomer(trx);
                  const isNew = highlightedTransactionIds.has(trx.id);
                  return (
                    <div key={trx.id} className={`grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] items-center gap-3 py-4 ${isNew ? 'new-transaction-card-highlight rounded-lg px-3' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-finance-500">No. Invoice</p>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold text-finance-950">{trx.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-finance-500">Nama</p>
                        <p className="mt-1 truncate text-sm font-medium text-finance-900">{customer.name}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="px-2 text-primary" onClick={() => navigate(`/transactions/${trx.id}`)}>
                        Lihat Detail
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pembeli</TableHead>
                  <TableHead className="text-right">Total Transaksi</TableHead>
                  <TableHead>Status Pembayaran</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-finance-500">
                      Memuat transaksi...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-finance-500">
                      Tidak ada transaksi ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((trx) => {
                    const customer = getListCustomer(trx);
                    const isNew = highlightedTransactionIds.has(trx.id);
                    return (
                      <TableRow key={trx.id} className={isNew ? 'new-transaction-highlight' : undefined}>
                        <TableCell className="font-medium text-finance-900">
                          <Link to={`/transactions/${trx.id}`} className="flex items-center space-x-2 transition-colors hover:text-primary">
                            <FileText size={16} className="text-finance-400" />
                            <span>{trx.invoiceNumber}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{format(new Date(trx.date), 'dd MMM yyyy, HH:mm')}</TableCell>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell className="text-right font-medium">Rp {trx.total.toLocaleString('id-ID')}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleStatus(trx.id, trx.status)}
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-80 ${
                              trx.status === 'Lunas' ? 'border-green-500/25 bg-green-500/15 text-green-600' : 'border-accent/30 bg-accent/10 text-accent'
                            }`}
                          >
                            {trx.status === 'Lunas' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            <span>{trx.status}</span>
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="font-medium text-primary" onClick={() => navigate(`/transactions/${trx.id}`)}>
                            Lihat Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
