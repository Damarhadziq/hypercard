import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@pokemon-finance/ui';
import { Check, CheckCircle2, ChevronDown, Clock, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { InvoiceItem, PaymentMethod, Product } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import CleanSelect from '../components/CleanSelect';
import ShippingForm from '../components/ShippingForm';
import { useFeedback } from '../components/Feedback';
import { downloadInvoicePdf } from '../lib/invoicePdf';
import { calculateInvoiceSubtotal, calculateInvoiceTotal } from '../lib/invoiceUtils';
import { getRarityCode } from '../lib/rarity';
import { useCustomers, useProducts, useTransactionMutations, useTransactions } from '../hooks/useApiQueries';
import { emptyInvoiceShipping } from '../services/shipping';
import { InvoiceFormSkeleton } from '../components/LoadingSkeleton';

const cardGradientByName: Record<string, string> = {
  pikachu: 'from-yellow-200 via-amber-300 to-orange-400',
  charizard: 'from-orange-300 via-red-400 to-slate-900',
};

function getCardGradient(name: string) {
  const normalizedName = name.toLowerCase();
  const key = Object.keys(cardGradientByName).find((item) => normalizedName.includes(item));
  return key ? cardGradientByName[key] : 'from-sky-200 via-indigo-300 to-slate-800';
}

function ProductThumb({ product }: { product: Product }) {
  if (product.image) {
    return <img src={product.image} alt={product.name} className="h-full w-full object-cover" />;
  }

  return (
    <div className={`relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br ${getCardGradient(product.name)} p-2 text-white`}>
      <div className="text-[8px] font-semibold uppercase text-white/80">{getRarityCode(product.rarity) || product.category}</div>
      <div className="absolute inset-x-3 top-7 aspect-square rounded-full bg-accent/15 blur-sm" />
      <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-2xl font-black">
        {product.name.charAt(0)}
      </div>
      <div className="relative text-[9px] font-bold leading-tight">{product.cardNumber || product.condition}</div>
    </div>
  );
}

function ProductDropdown({
  products,
  invoiceItems,
  recentProductIds,
  value,
  onChange,
}: {
  products: Product[];
  invoiceItems: InvoiceItem[];
  recentProductIds: Set<string>;
  value: string;
  onChange: (productId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [dropdownLayout, setDropdownLayout] = useState({
    left: 0,
    top: 0,
    width: 0,
    maxHeight: 360,
    placement: 'bottom' as 'top' | 'bottom',
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedProduct = products.find((product) => product.id === value);
  const filteredProducts = products
    .filter((product) => {
      const quantityInInvoice = invoiceItems.find((item) => item.productId === product.id)?.quantity ?? 0;
      const availableStock = product.stock - quantityInInvoice;
      return availableStock > 0 && [product.name, product.setName, product.cardNumber, product.rarity]
        .some((item) => item?.toLowerCase().includes(query.trim().toLowerCase()));
    })
    .sort((a, b) => {
      const recentDelta = Number(recentProductIds.has(b.id)) - Number(recentProductIds.has(a.id));
      if (recentDelta !== 0) return recentDelta;
      return products.indexOf(b) - products.indexOf(a);
    });

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updateDropdownLayout = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportMargin = 16;
      const availableBelow = window.innerHeight - rect.bottom - viewportMargin;
      const availableAbove = rect.top - viewportMargin;
      const placement = availableBelow < 320 && availableAbove > availableBelow ? 'top' : 'bottom';
      const availableSpace = placement === 'top' ? availableAbove : availableBelow;
      const maxHeight = Math.max(220, Math.min(420, availableSpace));

      setDropdownLayout({
        left: rect.left,
        top: placement === 'top' ? rect.top - maxHeight - 8 : rect.bottom + 8,
        width: rect.width,
        maxHeight,
        placement,
      });
    };

    updateDropdownLayout();
    window.addEventListener('resize', updateDropdownLayout);
    window.addEventListener('scroll', updateDropdownLayout, true);
    return () => {
      window.removeEventListener('resize', updateDropdownLayout);
      window.removeEventListener('scroll', updateDropdownLayout, true);
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
        className="select-trigger flex h-11 w-full select-none items-center justify-between gap-3 rounded-md border border-finance-200 bg-white px-3 py-2 text-left shadow-none transition-colors duration-200 hover:border-finance-300 focus:outline-none"
      >
        {selectedProduct ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-finance-950">{selectedProduct.name}</p>
          </div>
        ) : (
          <span className="text-sm text-finance-400">Pilih produk</span>
        )}
        <div className="flex shrink-0 items-center gap-3">
          {selectedProduct && <span className="hidden text-sm font-bold text-finance-950 sm:block">Rp {selectedProduct.sellPrice.toLocaleString('id-ID')}</span>}
          <ChevronDown size={16} className={`text-finance-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          style={{
            left: dropdownLayout.left,
            top: dropdownLayout.top,
            width: dropdownLayout.width,
            minWidth: dropdownLayout.width,
            maxWidth: dropdownLayout.width,
            maxHeight: dropdownLayout.maxHeight,
            transformOrigin: dropdownLayout.placement === 'top' ? 'bottom center' : 'top center',
          }}
          className="dropdown-surface premium-dark animate-dropdown-in fixed z-[1400] box-border flex min-h-0 flex-col overflow-hidden rounded-lg border bg-[#0c0c0f] p-1 shadow-xl"
        >
          <div className="relative m-1 mb-2">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-finance-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              data-focused={isSearchFocused}
              placeholder="Cari nama, set, rarity, atau nomor..."
              className="dropdown-search h-10 w-full rounded-md border border-finance-200 bg-finance-50 pl-9 pr-3 text-sm text-finance-950 placeholder:text-finance-400"
            />
          </div>
          <div className="styled-scrollbar min-h-0 flex-1 overflow-y-auto">
          {filteredProducts.map((product) => {
            const isSelected = product.id === value;
            const quantityInInvoice = invoiceItems.find((item) => item.productId === product.id)?.quantity ?? 0;
            const availableStock = product.stock - quantityInInvoice;
            return (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(product.id);
                  setIsOpen(false);
                }}
                className={`grid w-full select-none grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                  isSelected ? 'bg-finance-100' : 'hover:bg-finance-50'
                }`}
              >
                <div className="h-14 w-11 overflow-hidden rounded border border-finance-200 bg-finance-100">
                  <ProductThumb product={product} />
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-finance-950">{product.name}</p>
                    {recentProductIds.has(product.id) && (
                      <span className="shrink-0 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        Baru
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-finance-500">{product.condition} · Sisa {availableStock}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-finance-950">Rp {product.sellPrice.toLocaleString('id-ID')}</p>
                  {isSelected && <Check size={15} className="text-primary" />}
                </div>
              </button>
            );
          })}
          {filteredProducts.length === 0 && <p className="px-3 py-6 text-center text-sm text-finance-500">Produk tidak ditemukan.</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function Invoices() {
  const { sellerInfo, updateSellerInfo } = useStore();
  const productsQuery = useProducts({ limit: 1000, inStock: true });
  const customersQuery = useCustomers({ limit: 1000 });
  const transactionsQuery = useTransactions({ limit: 1000 });
  const products = productsQuery.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];
  const transactions = transactionsQuery.data?.data ?? [];
  const { createTransaction, updateTransactionStatus } = useTransactionMutations();
  const navigate = useNavigate();
  const { notify } = useFeedback();

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [shipping, setShipping] = useState(() => emptyInvoiceShipping());
  const [paymentStatus, setPaymentStatus] = useState<'Lunas' | 'Belum Dibayar'>('Belum Dibayar');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Lainnya');
  const [bcaAccountNumber, setBcaAccountNumber] = useState(sellerInfo.bcaAccountNumber);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isItemListExpanded, setIsItemListExpanded] = useState(false);
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const visibleItems = isItemListExpanded ? items : items.slice(0, 2);
  const hiddenItemCount = Math.max(0, items.length - 2);
  const isSavingInvoice = isInvoiceSubmitting || createTransaction.isPending || updateTransactionStatus.isPending;
  const isInvoiceDataLoading = productsQuery.isLoading || customersQuery.isLoading || transactionsQuery.isLoading;
  const recentProductIds = new Set(products.slice(-3).map((product) => product.id));
  const recentCustomerIds = new Set(customers.slice(-3).map((customer) => customer.id));
  const customerTransactionCounts = transactions.reduce<Record<string, number>>((acc, transaction) => {
    acc[transaction.customerId] = (acc[transaction.customerId] ?? 0) + 1;
    return acc;
  }, {});
  const sortedCustomers = [...customers].sort((a, b) => {
    const loyalDelta = Number((customerTransactionCounts[b.id] ?? 0) > 0) - Number((customerTransactionCounts[a.id] ?? 0) > 0);
    if (loyalDelta !== 0) return loyalDelta;
    const recentDelta = Number(recentCustomerIds.has(b.id)) - Number(recentCustomerIds.has(a.id));
    if (recentDelta !== 0) return recentDelta;
    return customers.indexOf(b) - customers.indexOf(a);
  });

  const handleCustomerChange = (nextCustomerId: string) => {
    setCustomerId(nextCustomerId);
    setShipping(emptyInvoiceShipping());
  };

  const handleAddItem = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stock <= 0) return;

    const existingItem = items.find((item) => item.productId === productId);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        notify('error', 'Stok tidak mencukupi', `${product.name} sudah mencapai batas stok yang tersedia.`);
        setSelectedProductId('');
        return;
      }
      setItems(items.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item));
      setSelectedProductId('');
      return;
    }

    setItems([...items, {
      productId,
      quantity: 1,
      price: product.sellPrice,
      productName: product.name,
      productCategory: product.category,
      productCondition: product.condition,
      productSetName: product.setName,
      productRarity: product.rarity,
      productLanguage: product.language,
      productCardNumber: product.cardNumber,
      productImage: product.image,
      buyPrice: product.buyPrice,
    }]);
    setSelectedProductId('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.productId !== id));
  };

  const resetInvoiceForm = (nextBcaAccountNumber = sellerInfo.bcaAccountNumber) => {
    setCustomerId('');
    setItems([]);
    setShipping(emptyInvoiceShipping());
    setPaymentStatus('Belum Dibayar');
    setPaymentMethod('Lainnya');
    setBcaAccountNumber(nextBcaAccountNumber);
    setSelectedProductId('');
    setIsItemListExpanded(false);
  };

  const subtotal = calculateInvoiceSubtotal(items);
  const total = calculateInvoiceTotal(subtotal, shipping.shippingCost);

  const handleSaveInvoice = async (printAfterSave = false) => {
    if (isSavingInvoice) return;
    if (!customerId || items.length === 0) return;
    if (paymentMethod === 'BCA' && !bcaAccountNumber.trim()) {
      notify('error', 'Nomor rekening BCA belum diisi', 'Isi nomor rekening BCA sebelum menyimpan invoice.');
      return;
    }
    const unavailableItem = items.find((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return !product || product.stock < item.quantity;
    });
    if (unavailableItem) {
      notify('error', 'Stok berubah', 'Ada produk yang stoknya tidak lagi mencukupi. Periksa ulang item invoice.');
      return;
    }

    try {
      setIsInvoiceSubmitting(true);
      let transaction = await createTransaction.mutateAsync({
        customerId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        shippingCost: shipping.shippingCost,
        shippingCourier: shipping.courier || undefined,
        shippingService: shipping.service || undefined,
        shippingDescription: shipping.description,
        shippingEtd: shipping.etd,
        shippingWeight: shipping.weight || undefined,
        shippingOrigin: shipping.origin || undefined,
        shippingDestination: shipping.destination || undefined,
        total,
        paymentMethod,
        mandiriAccountNumber: sellerInfo.bankAccountNumber,
        mandiriAccountHolder: sellerInfo.bankAccountHolder,
        bcaAccountNumber: bcaAccountNumber.trim() || undefined,
        bcaAccountHolder: sellerInfo.bcaAccountHolder,
        date: new Date().toISOString(),
      });

      if (paymentStatus === 'Lunas') {
        transaction = await updateTransactionStatus.mutateAsync({
          id: transaction.id,
          input: {
            status: paymentStatus,
            paymentMethod,
            mandiriAccountNumber: sellerInfo.bankAccountNumber,
            mandiriAccountHolder: sellerInfo.bankAccountHolder,
            bcaAccountNumber,
            bcaAccountHolder: sellerInfo.bcaAccountHolder,
          },
        });
      }

      const nextBcaAccountNumber = bcaAccountNumber.trim() || sellerInfo.bcaAccountNumber;
      if (nextBcaAccountNumber !== sellerInfo.bcaAccountNumber) {
        updateSellerInfo({ bcaAccountNumber: nextBcaAccountNumber });
      }

      notify('success', 'Invoice berhasil dibuat', `${transaction.invoiceNumber} telah disimpan dengan status ${paymentStatus}.`);
      if (printAfterSave) {
        try {
          await downloadInvoicePdf({
            transaction,
            sellerInfo: {
              ...sellerInfo,
              bcaAccountNumber: bcaAccountNumber.trim() || sellerInfo.bcaAccountNumber,
            },
            filename: `${transaction.invoiceNumber}.pdf`,
          });
          notify('success', 'PDF berhasil diunduh', `${transaction.invoiceNumber} sudah dibuat.`);
        } catch (error) {
          notify('error', 'PDF gagal dibuat', error instanceof Error ? error.message : 'Invoice tersimpan, tetapi PDF gagal dibuat.');
        }
        await Promise.all([
          productsQuery.refetch(),
          transactionsQuery.refetch(),
        ]);
        resetInvoiceForm(nextBcaAccountNumber);
      }
      if (!printAfterSave) {
        resetInvoiceForm(nextBcaAccountNumber);
        navigate('/transactions', { state: { newTransactionId: transaction.id } });
      }
    } catch (error) {
      notify('error', 'Invoice gagal dibuat', error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan invoice.');
    } finally {
      setIsInvoiceSubmitting(false);
    }
  };

  return (
    <div className="animate-soft-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-finance-950">Buat Invoice Baru</h1>
          <p className="mt-1 text-sm text-finance-500">Buat tagihan penjualan ke pembeli.</p>
        </div>
      </div>

      {isInvoiceDataLoading ? (
        <InvoiceFormSkeleton />
      ) : (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="animate-soft-in">
            <CardHeader>
              <CardTitle>Data Pembeli & Produk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pilih Pembeli</label>
                <CleanSelect
                  value={customerId}
                  onChange={handleCustomerChange}
                  placeholder="Pilih Pembeli"
                  searchable
                  searchPlaceholder="Cari nama atau nomor handphone..."
                  options={
                    sortedCustomers.map((customer) => ({
                      value: customer.id,
                      label: `${customer.name} (${customer.phone || customer.address})`,
                      description: customer.address,
                      badge: customerTransactionCounts[customer.id] > 0
                        ? 'Langganan'
                        : recentCustomerIds.has(customer.id)
                          ? 'Terbaru'
                          : undefined,
                    }))
                  }
                />
              </div>

              <div className="border-t border-finance-100 pt-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pilih Produk</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <ProductDropdown products={products} invoiceItems={items} recentProductIds={recentProductIds} value={selectedProductId} onChange={setSelectedProductId} />
                    </div>
                    <Button
                      type="button"
                      disabled={!selectedProduct || selectedProduct.stock <= 0}
                      onClick={() => selectedProduct && handleAddItem(selectedProduct.id)}
                      className="h-11 w-full gap-1.5 sm:w-auto"
                    >
                      <Plus size={15} />
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border-t border-finance-100 pt-5">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead className="text-right">Harga</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleItems.map((item) => {
                          const product = products.find((prod) => prod.id === item.productId);
                          return (
                            <TableRow key={item.productId}>
                              <TableCell className="min-w-56 font-medium">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded border border-finance-200 bg-finance-100">
                                    {item.productImage ? (
                                      <img src={item.productImage} alt={item.productName || product?.name || 'Produk'} className="h-full w-full object-cover" />
                                    ) : product ? (
                                      <ProductThumb product={product} />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-finance-500">?</div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate">{item.productName || product?.name || 'Produk'}</p>
                                    <p className="mt-1 truncate text-xs font-normal text-finance-500">
                                      {item.productSetName || product?.setName || item.productCondition || product?.condition || '-'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">Rp {item.price.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right font-medium">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleRemoveItem(item.productId)} aria-label={`Hapus ${item.productName || product?.name || 'produk'}`}>
                                  <Trash2 size={16} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {hiddenItemCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsItemListExpanded((current) => !current)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-finance-200 bg-finance-50 px-4 py-3 text-sm font-semibold text-finance-600 transition-colors hover:border-finance-300 hover:bg-finance-100 hover:text-finance-900"
                      >
                        <span>{isItemListExpanded ? 'Tampilkan lebih sedikit' : `Lihat ${hiddenItemCount} produk lagi`}</span>
                        <ChevronDown size={16} className={`transition-transform ${isItemListExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="animate-soft-in xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle>Ringkasan Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-finance-500">Subtotal</span>
                <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="border-t border-finance-100 pt-4">
                <ShippingForm
                  key={customerId || 'empty-customer'}
                  value={shipping}
                  onChange={setShipping}
                />
                {shipping.service && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-finance-200 bg-finance-50 px-3 py-2 text-xs">
                    <span className="min-w-0 truncate text-finance-500">
                      {shipping.courier} {shipping.service}
                      {shipping.etd ? ` · ${shipping.etd} hari` : ''}
                    </span>
                    <span className="shrink-0 font-bold text-finance-900">
                      Rp {shipping.shippingCost.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
              <div className="border-t border-finance-100 pt-4">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-finance-900">Status Pembayaran</span>
                  <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                    paymentStatus === 'Lunas'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-accent/10 text-accent'
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-finance-200 bg-finance-50 p-1" role="group" aria-label="Status pembayaran invoice">
                  <button
                    type="button"
                    aria-pressed={paymentStatus === 'Belum Dibayar'}
                    onClick={() => {
                      setPaymentStatus('Belum Dibayar');
                      setPaymentMethod('Lainnya');
                    }}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-all active:brightness-95 ${
                      paymentStatus === 'Belum Dibayar'
                        ? 'border border-accent/45 bg-accent/15 text-accent'
                        : 'border border-transparent text-finance-500 hover:bg-finance-100 hover:text-finance-900'
                    }`}
                  >
                    <Clock size={15} />
                    Belum Dibayar
                  </button>
                  <button
                    type="button"
                    aria-pressed={paymentStatus === 'Lunas'}
                    onClick={() => {
                      setPaymentStatus('Lunas');
                      if (paymentMethod === 'Lainnya') setPaymentMethod('Mandiri');
                    }}
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-all active:brightness-95 ${
                      paymentStatus === 'Lunas'
                        ? 'border border-green-500/40 bg-green-500/10 text-green-500'
                        : 'border border-transparent text-finance-500 hover:bg-finance-100 hover:text-finance-900'
                    }`}
                  >
                    <CheckCircle2 size={15} />
                    Lunas
                  </button>
                </div>
              </div>
              <div className="border-t border-finance-100 pt-4">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-finance-900">Metode Pembayaran</span>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                    {paymentMethod}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2" role="group" aria-label="Metode pembayaran invoice">
                  <button
                    type="button"
                    aria-pressed={paymentMethod === 'Mandiri'}
                    onClick={() => setPaymentMethod('Mandiri')}
                    className={`grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-lg border p-2.5 text-left transition-all active:brightness-95 ${
                      paymentMethod === 'Mandiri'
                        ? 'border-accent/60 bg-accent/10'
                        : 'border-finance-200 bg-finance-50 hover:border-finance-300 hover:bg-finance-100'
                    }`}
                  >
                    <div className="flex h-12 w-28 items-center justify-center rounded-md bg-white px-3 py-2">
                      <img src="/bank-mandiri.svg" alt="Bank Mandiri" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-finance-900">Mandiri</p>
                      <p className="mt-1 truncate text-xs text-finance-500">{sellerInfo.bankAccountNumber}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-pressed={paymentMethod === 'BCA'}
                    onClick={() => setPaymentMethod('BCA')}
                    className={`grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-lg border p-2.5 text-left transition-all active:brightness-95 ${
                      paymentMethod === 'BCA'
                        ? 'border-[#2fa6fc]/65 bg-[#0066ae]/15'
                        : 'border-finance-200 bg-finance-50 hover:border-finance-300 hover:bg-finance-100'
                    }`}
                  >
                    <div className="flex h-12 w-28 items-center justify-center rounded-md bg-white px-3 py-2">
                      <img src="/bank-bca.svg" alt="BCA" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-finance-900">BCA</p>
                      <p className="mt-1 truncate text-xs text-finance-500">
                        {bcaAccountNumber || 'Nomor belum diatur'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-pressed={paymentMethod === 'Lainnya'}
                    onClick={() => setPaymentMethod('Lainnya')}
                    className={`grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-lg border p-2.5 text-left transition-all active:brightness-95 ${
                      paymentMethod === 'Lainnya'
                        ? 'border-accent/60 bg-accent/10'
                        : 'border-finance-200 bg-finance-50 hover:border-finance-300 hover:bg-finance-100'
                    }`}
                  >
                    <div className="flex h-12 w-28 items-center justify-center rounded-md border border-finance-200 bg-finance-100 px-3 py-2 text-xs font-black tracking-wide text-accent">
                      LAINNYA
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-finance-900">Metode Lainnya</p>
                      <p className="mt-1 truncate text-xs text-finance-500">Tidak menggunakan rekening bank di atas</p>
                    </div>
                  </button>
                </div>
                {paymentMethod === 'BCA' && !sellerInfo.bcaAccountNumber && (
                  <div className="mt-3 space-y-1.5">
                    <label htmlFor="bca-account-number" className="text-xs font-semibold text-finance-700">
                      Nomor rekening BCA <span className="text-primary">*</span>
                    </label>
                    <Input
                      id="bca-account-number"
                      inputMode="numeric"
                      value={bcaAccountNumber}
                      onChange={(event) => setBcaAccountNumber(event.target.value.replace(/\D/g, ''))}
                      placeholder="Masukkan nomor rekening BCA"
                      className="h-10"
                    />
                    <p className="text-[11px] leading-4 text-finance-500">
                      Nomor akan disimpan untuk invoice berikutnya.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-finance-100 pt-4">
                <span className="font-bold">Total Harga</span>
                <span className="text-xl font-bold text-primary">Rp {total.toLocaleString('id-ID')}</span>
              </div>

              <div className="space-y-3 pt-6">
                <Button
                  className="flex w-full items-center justify-center space-x-2"
                  size="lg"
                  onClick={() => handleSaveInvoice()}
                  disabled={!customerId || items.length === 0 || isSavingInvoice}
                >
                  <span>{isSavingInvoice ? 'Menyimpan...' : 'Simpan Invoice'}</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex w-full items-center justify-center space-x-2"
                  onClick={() => handleSaveInvoice(true)}
                  disabled={!customerId || items.length === 0 || isSavingInvoice}
                >
                  <span>{isSavingInvoice ? 'Menyimpan...' : 'Simpan & Download PDF'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
