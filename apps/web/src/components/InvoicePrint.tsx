import { format } from 'date-fns';
import { id as indonesiaLocale } from 'date-fns/locale';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Store,
  UserRound,
} from 'lucide-react';
import {
  type InvoiceItem,
  type SellerInfo,
  type Transaction,
  useStore,
} from '../store/useStore';
import { useTransaction } from '../hooks/useApiQueries';

const CONTINUATION_PAGE_CAPACITY = 8;
const FINAL_PAGE_CAPACITY = 3;
const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

function paginateInvoiceItems(items: InvoiceItem[]) {
  if (items.length <= FINAL_PAGE_CAPACITY) {
    return [{ items, startIndex: 0, isLast: true }];
  }

  const pageCount = 1 + Math.ceil((items.length - FINAL_PAGE_CAPACITY) / CONTINUATION_PAGE_CAPACITY);
  const finalPageSize = Math.min(FINAL_PAGE_CAPACITY, Math.ceil(items.length / pageCount));
  const itemsBeforeFinalPage = items.length - finalPageSize;
  const continuationPageCount = pageCount - 1;
  const continuationPageSize = Math.ceil(itemsBeforeFinalPage / continuationPageCount);
  const pages: Array<{ items: InvoiceItem[]; startIndex: number; isLast: boolean }> = [];
  let startIndex = 0;

  for (let pageIndex = 0; pageIndex < continuationPageCount; pageIndex += 1) {
    const pageItems = items.slice(startIndex, startIndex + continuationPageSize);
    pages.push({ items: pageItems, startIndex, isLast: false });
    startIndex += pageItems.length;
  }

  pages.push({
    items: items.slice(startIndex),
    startIndex,
    isLast: true,
  });

  return pages;
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="invoice-section-title">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="invoice-info-row">
      <span className="mt-px text-[#d6b45d]">{icon}</span>
      <span className="font-semibold text-[#242424]">{label}</span>
      <span>:</span>
      <span className="break-words font-medium text-[#111]">{value || '-'}</span>
    </div>
  );
}

function InvoiceHeader({
  transaction,
  pageNumber,
  pageCount,
}: {
  transaction: Transaction;
  pageNumber: number;
  pageCount: number;
}) {
  const paid = transaction.status === 'Lunas';

  return (
    <header className="invoice-hero">
      <div className="invoice-cut invoice-cut-left" />
      <div className="invoice-cut invoice-cut-right" />

      <div className="invoice-brand">
        <img src="/hypercard-logo.png" alt="Hypercard" className="invoice-brand-logo" />
        <div className="invoice-brand-copy">
          <h1 className="invoice-title">INVOICE</h1>
          <div className="invoice-subtitle">
            <span className="invoice-subtitle-line" />
            <span>POKEMON TRADING CARD</span>
            <span className="invoice-subtitle-line" />
          </div>
        </div>
      </div>

      <div className="invoice-meta">
        <p className="text-[8px] font-bold tracking-[0.16em] text-white/70">INVOICE NO.</p>
        <p className="invoice-number">{transaction.invoiceNumber}</p>
        <div className="my-2.5 h-px bg-white/15" />
        <div className="invoice-meta-grid">
          <div>
            <p className="text-[8px] font-bold tracking-[0.12em] text-white/70">
              TANGGAL PEMBELIAN
            </p>
            <div className="invoice-date">
              <CalendarDays size={15} strokeWidth={2.4} />
              <span>
                {format(new Date(transaction.date), 'd MMMM yyyy', { locale: indonesiaLocale })}
              </span>
            </div>
          </div>
          <div className="invoice-page-number">
            <span>HALAMAN</span>
            <strong>{pageNumber}/{pageCount}</strong>
          </div>
        </div>
        <div className={`invoice-payment-status ${paid ? 'is-paid' : 'is-pending'}`}>
          {paid ? <CheckCircle2 size={13} /> : <Clock size={13} />}
          <span>{transaction.status}</span>
        </div>
      </div>
    </header>
  );
}

function InvoiceParties({
  customer,
  sellerInfo,
}: {
  customer: Pick<import('../store/useStore').Customer, 'name' | 'phone' | 'address' | 'postalCode'>;
  sellerInfo: SellerInfo;
}) {
  return (
    <section className="invoice-parties">
      <div className="invoice-party invoice-party-buyer">
        <SectionTitle icon={<UserRound size={15} />}>PEMBELI</SectionTitle>
        <div className="invoice-party-content">
          <InfoRow icon={<UserRound size={13} />} label="Nama" value={customer.name} />
          <InfoRow icon={<Phone size={13} />} label="Nomor" value={customer.phone} />
          <InfoRow icon={<MapPin size={13} />} label="Alamat" value={customer.address} />
          <InfoRow icon={<Mail size={13} />} label="Kode Pos" value={customer.postalCode} />
        </div>
      </div>

      <div className="invoice-party">
        <SectionTitle icon={<Store size={15} />}>SELLER</SectionTitle>
        <div className="invoice-party-content">
          <InfoRow icon={<UserRound size={13} />} label="Nama" value={sellerInfo.name} />
          <InfoRow icon={<Phone size={13} />} label="Nomor" value={sellerInfo.phone} />
          <InfoRow icon={<MapPin size={13} />} label="Lokasi" value={sellerInfo.location} />
        </div>
      </div>
    </section>
  );
}

function InvoiceItems({
  items,
  startIndex,
}: {
  items: InvoiceItem[];
  startIndex: number;
}) {
  return (
    <table className="invoice-items-table">
      <thead>
        <tr className="bg-black text-white">
          <th className="w-[10%] border-r border-[#d71920] px-2 py-2.5 text-center">NO.</th>
          <th className="w-[48%] border-r border-[#d71920] px-3 py-2.5 text-left">NAMA BARANG</th>
          <th className="w-[10%] border-r border-[#d71920] px-2 py-2.5 text-center">QTY</th>
          <th className="w-[16%] border-r border-[#d71920] px-2 py-2.5 text-right">HARGA</th>
          <th className="w-[16%] px-2 py-2.5 text-right">JUMLAH</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const productMeta = [
            item.productSetName,
            item.productCondition,
            item.productRarity,
          ].filter(Boolean).join(' - ');

          return (
            <tr key={`${item.productId}-${startIndex + index}`} className="invoice-item-row">
              <td className="border-x border-[#e5b3b5] px-2 py-3 text-center">{startIndex + index + 1}</td>
              <td className="border-r border-[#e5b3b5] px-3 py-3">
                <p className="invoice-product-name">{item.productName || 'Produk'}</p>
                <p className="invoice-product-meta" title={productMeta}>{productMeta || '-'}</p>
              </td>
              <td className="border-r border-[#e5b3b5] px-2 py-3 text-center">{item.quantity}</td>
              <td className="border-r border-[#e5b3b5] px-2 py-3 text-right">{rupiah(item.price)}</td>
              <td className="border-r border-[#e5b3b5] px-2 py-3 text-right font-semibold">
                {rupiah(item.price * item.quantity)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function InvoiceSummary({ transaction, sellerInfo }: { transaction: Transaction; sellerInfo: SellerInfo }) {
  const selectedMethod = transaction.paymentMethod || 'Lainnya';
  const paymentAccounts = [
    {
      method: 'Mandiri',
      number: transaction.mandiriAccountNumber ?? sellerInfo.bankAccountNumber,
      holder: transaction.mandiriAccountHolder ?? sellerInfo.bankAccountHolder,
    },
    {
      method: 'BCA',
      number: transaction.bcaAccountNumber ?? sellerInfo.bcaAccountNumber,
      holder: transaction.bcaAccountHolder ?? sellerInfo.bcaAccountHolder,
    },
    {
      method: 'Lainnya',
      number: '',
      holder: '',
    },
  ] as const;
  const selectedAccount = paymentAccounts.find((account) => account.method === selectedMethod) ?? paymentAccounts[2];

  return (
    <>
      <div className="invoice-summary">
        <div className="flex justify-between border-b border-[#e5b3b5] px-3 py-2">
          <span className="font-bold">SUBTOTAL</span>
          <span>{rupiah(transaction.subtotal)}</span>
        </div>
        <div className="flex justify-between px-3 py-2">
          <span className="font-bold">ONGKIR</span>
          <span>{rupiah(transaction.shippingCost ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e5b3b5] px-3 py-2">
          <span className="font-bold">STATUS PEMBAYARAN</span>
          <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[8px] font-black ${
            transaction.status === 'Lunas'
              ? 'bg-[#dff4e7] text-[#087a3e]'
              : 'bg-[#fff0cc] text-[#8a5b00]'
          }`}>
            {transaction.status === 'Lunas' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
            {transaction.status}
          </span>
        </div>
        {transaction.status === 'Lunas' && (
          <div className="invoice-payment-row">
            <span className="font-bold">METODE PEMBAYARAN</span>
            <span>{selectedAccount.method}</span>
          </div>
        )}
      </div>

      <div className="invoice-bottom-grid">
        <div className="invoice-info-box">
          <p className="font-black">INFORMASI PEMBAYARAN</p>
          <p className="mt-2 text-[8px] font-bold text-[#777]">BANK</p>
          <p className="text-[10px] font-black text-[#111]">{selectedAccount.method}</p>
          <p className="mt-1 text-[8px] font-bold text-[#777]">NO. REKENING</p>
          <p className="text-[10px] font-black text-[#111]">
            {selectedMethod === 'Lainnya' ? 'Tidak menggunakan rekening bank' : selectedAccount.number || 'Nomor belum diatur'}
          </p>
        </div>
        <div className="invoice-info-box">
          <p className="font-black">PERATURAN PEMBAYARAN</p>
          <p className="mt-2 text-[9px] leading-relaxed text-[#555]">
            Pembayaran dianggap sah setelah dana diterima. Simpan bukti transfer untuk konfirmasi jika diperlukan.
          </p>
        </div>
      </div>

      <div className="invoice-total">
        <div className="flex flex-1 items-center justify-end bg-[#c50f16] px-5 py-2 text-[15px] font-black italic">
          TOTAL
        </div>
        <div className="min-w-[45%] bg-black px-4 py-2 text-right text-[15px] font-black">
          {rupiah(transaction.total)}
        </div>
      </div>
    </>
  );
}

function InvoiceFooter({ sellerInfo }: { sellerInfo: SellerInfo }) {
  return (
    <footer className="invoice-footer">
      <div className="invoice-footer-line" />
      <h2 className="relative z-10 text-center text-[20px] font-black italic tracking-[0.05em]">
        TERIMA KASIH!
      </h2>
      <p className="relative z-10 mt-1 text-center text-[8px] italic text-white/80">
        Terima kasih atas kepercayaan Anda. Semoga barang yang diterima sesuai harapan.
      </p>
      <p className="relative z-10 mt-1 text-center text-[7px] font-bold uppercase tracking-[0.16em] text-[#d6b45d]">
        Hypercard - Pokemon Trading Card
      </p>
      <div className="relative z-10 mt-4 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={17} className="text-[#d6b45d]" />
          <div>
            <p className="text-[7px] font-bold text-[#d6b45d]">LOKASI SELLER</p>
            <p className="text-[9px]">{sellerInfo.location}</p>
          </div>
        </div>
        <img src="/hypercard-logo.png" alt="Hypercard" className="h-[18mm] w-[31mm] object-contain" />
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-[7px] font-bold text-[#d6b45d]">NOMOR SELLER</p>
            <p className="text-[9px]">{sellerInfo.phone}</p>
          </div>
          <Phone size={17} className="text-[#d6b45d]" />
        </div>
      </div>
    </footer>
  );
}

export default function InvoicePrint({
  transactionId,
  visible = false,
  contentId = 'invoice-pdf-content',
}: {
  transactionId: string;
  visible?: boolean;
  contentId?: string;
}) {
  const sellerInfo = useStore((state) => state.sellerInfo);
  const transactionQuery = useTransaction(transactionId);
  const transaction = transactionQuery.data;

  if (!transaction) return null;

  const customer = {
    name: transaction.customerName || 'Pembeli',
    phone: transaction.customerPhone ?? '-',
    address: transaction.customerAddress ?? '-',
    postalCode: transaction.customerPostalCode ?? '-',
  };
  const pages = paginateInvoiceItems(transaction.items);
  const pageCount = pages.length;

  return (
    <div className={`invoice-preview-wrapper ${visible ? 'block' : 'hidden'}`}>
      <div id={contentId} className="invoice-print-root invoice-pdf-content">
        {pages.map((page, pageIndex) => (
          <article className="invoice-sheet invoice-pdf-page" key={`${transaction.id}-page-${pageIndex + 1}`}>
            <InvoiceHeader
              transaction={transaction}
              pageNumber={pageIndex + 1}
              pageCount={pageCount}
            />

            <main className="invoice-body">
              <img
                src="/hypercard-logo.png"
                alt=""
                aria-hidden="true"
                className="invoice-watermark"
              />
              <InvoiceParties customer={customer} sellerInfo={sellerInfo} />

              <section className="invoice-items-section">
                <InvoiceItems items={page.items} startIndex={page.startIndex} />
                {page.isLast && <InvoiceSummary transaction={transaction} sellerInfo={sellerInfo} />}
              </section>
            </main>

            <InvoiceFooter sellerInfo={sellerInfo} />
          </article>
        ))}
      </div>
    </div>
  );
}
