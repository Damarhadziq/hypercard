import type { SellerInfo, Transaction } from '../store/useStore';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 12;
const GOLD = '#d6b45d';
const BLACK = '#09090b';
const DARK_TEXT = '#171717';
const MUTED = '#666666';
const LINE = '#d8c58f';
const PAPER = '#fffdf8';

const rupiah = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;

async function loadImageData(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadFadedImageData(url: string, opacity: number): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.globalAlpha = opacity;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export async function downloadInvoicePdf({
  transaction,
  sellerInfo,
  filename,
}: {
  transaction: Transaction;
  sellerInfo: SellerInfo;
  filename?: string;
}) {
  const [{ jsPDF }, storeLogo, watermarkLogo] = await Promise.all([
    import('jspdf'),
    loadImageData('/hypercard-logo.png'),
    loadFadedImageData('/hypercard-logo.png', 0.06),
  ]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });

  const itemsPerPage = 8;
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(transaction.items.length / itemsPerPage)) },
    (_, index) => transaction.items.slice(index * itemsPerPage, (index + 1) * itemsPerPage),
  );

  const setText = (size: number, color = DARK_TEXT, style: 'normal' | 'bold' = 'normal') => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(color);
  };

  const drawLabelValue = (label: string, value: string, x: number, y: number, width: number) => {
    setText(7.5, MUTED, 'bold');
    pdf.text(label.toUpperCase(), x, y);
    setText(9, DARK_TEXT, 'bold');
    const lines = pdf.splitTextToSize(value || '-', width);
    pdf.text(lines, x, y + 5);
  };

  pages.forEach((pageItems, pageIndex) => {
    if (pageIndex > 0) pdf.addPage('a4', 'portrait');

    pdf.setFillColor(PAPER);
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

    if (watermarkLogo) {
      pdf.addImage(watermarkLogo, 'PNG', 34, 82, 142, 142, undefined, 'FAST');
    }

    pdf.setFillColor(BLACK);
    pdf.rect(0, 0, PAGE_WIDTH, 47, 'F');
    pdf.setFillColor(GOLD);
    pdf.rect(0, 45, PAGE_WIDTH, 2, 'F');

    if (storeLogo) {
      pdf.addImage(storeLogo, 'PNG', MARGIN, 7, 31, 31, undefined, 'FAST');
    }
    setText(27, '#ffffff', 'bold');
    pdf.text('INVOICE', 48, 23);
    setText(8, GOLD, 'bold');
    pdf.text('POKEMON TRADING CARD', 49, 30);

    const metaX = 140;
    pdf.setDrawColor(GOLD);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(metaX, 7, 58, 31, 1.5, 1.5, 'S');
    setText(7, '#bdbdbd', 'bold');
    pdf.text('INVOICE NO.', metaX + 4, 13);
    setText(11, '#ffffff', 'bold');
    pdf.text(transaction.invoiceNumber, metaX + 4, 19);
    setText(7, '#bdbdbd', 'bold');
    pdf.text('TANGGAL', metaX + 4, 25);
    setText(8.5, GOLD, 'bold');
    pdf.text(formatDate(transaction.date), metaX + 4, 31);
    setText(7, '#bdbdbd', 'bold');
    pdf.text(`HALAMAN ${pageIndex + 1}/${pages.length}`, metaX + 42, 36, { align: 'right' });

    const partyTop = 55;
    const partyHeight = 36;
    const columnWidth = (PAGE_WIDTH - (MARGIN * 2) - 6) / 2;
    pdf.setDrawColor(LINE);
    pdf.roundedRect(MARGIN, partyTop, columnWidth, partyHeight, 1.5, 1.5, 'S');
    pdf.roundedRect(MARGIN + columnWidth + 6, partyTop, columnWidth, partyHeight, 1.5, 1.5, 'S');
    pdf.setFillColor(GOLD);
    pdf.rect(MARGIN, partyTop, columnWidth, 7, 'F');
    pdf.rect(MARGIN + columnWidth + 6, partyTop, columnWidth, 7, 'F');
    setText(8, BLACK, 'bold');
    pdf.text('PEMBELI', MARGIN + 4, partyTop + 4.8);
    pdf.text('SELLER', MARGIN + columnWidth + 10, partyTop + 4.8);

    drawLabelValue('Nama', transaction.customerName || 'Pembeli', MARGIN + 4, partyTop + 13, 38);
    drawLabelValue('Nomor', transaction.customerPhone || '-', MARGIN + 47, partyTop + 13, 38);
    drawLabelValue('Alamat', transaction.customerAddress || '-', MARGIN + 4, partyTop + 25, columnWidth - 8);

    const sellerX = MARGIN + columnWidth + 10;
    drawLabelValue('Nama', sellerInfo.name, sellerX, partyTop + 13, 38);
    drawLabelValue('Nomor', sellerInfo.phone, sellerX + 43, partyTop + 13, 38);
    drawLabelValue('Lokasi', sellerInfo.location, sellerX, partyTop + 25, columnWidth - 8);

    let y = 99;
    const columns = [
      { label: 'NO.', x: MARGIN, width: 12, align: 'center' as const },
      { label: 'NAMA BARANG', x: MARGIN + 12, width: 80, align: 'left' as const },
      { label: 'QTY', x: MARGIN + 92, width: 15, align: 'center' as const },
      { label: 'HARGA', x: MARGIN + 107, width: 35, align: 'right' as const },
      { label: 'JUMLAH', x: MARGIN + 142, width: 44, align: 'right' as const },
    ];

    pdf.setFillColor(BLACK);
    pdf.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 10, 'F');
    setText(7.5, '#ffffff', 'bold');
    columns.forEach((column) => {
      const textX = column.align === 'left'
        ? column.x + 3
        : column.align === 'center'
          ? column.x + (column.width / 2)
          : column.x + column.width - 3;
      pdf.text(column.label, textX, y + 6.3, { align: column.align });
    });
    y += 10;

    pageItems.forEach((item, itemIndex) => {
      const rowHeight = 15;
      const absoluteIndex = (pageIndex * itemsPerPage) + itemIndex + 1;
      pdf.setDrawColor(LINE);
      pdf.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), rowHeight, 'S');
      [MARGIN + 12, MARGIN + 92, MARGIN + 107, MARGIN + 142].forEach((x) => {
        pdf.line(x, y, x, y + rowHeight);
      });

      setText(8, DARK_TEXT);
      pdf.text(String(absoluteIndex), MARGIN + 6, y + 8.5, { align: 'center' });
      setText(8.5, DARK_TEXT, 'bold');
      pdf.text(pdf.splitTextToSize(item.productName || 'Produk', 72), MARGIN + 15, y + 5.5);
      const metadata = [item.productSetName, item.productCondition, item.productRarity].filter(Boolean).join(' - ');
      setText(6.5, MUTED);
      pdf.text(pdf.splitTextToSize(metadata || '-', 72), MARGIN + 15, y + 11);
      setText(8, DARK_TEXT);
      pdf.text(String(item.quantity), MARGIN + 99.5, y + 8.5, { align: 'center' });
      pdf.text(rupiah(item.price), MARGIN + 139, y + 8.5, { align: 'right' });
      setText(8, DARK_TEXT, 'bold');
      pdf.text(rupiah(item.price * item.quantity), MARGIN + 183, y + 8.5, { align: 'right' });
      y += rowHeight;
    });

    const isLastPage = pageIndex === pages.length - 1;
    if (isLastPage) {
      const summaryRows: Array<{ label: string; value: string; strong?: boolean }> = [
        { label: 'SUBTOTAL', value: rupiah(transaction.subtotal) },
      ];
      if (transaction.discount > 0) {
        summaryRows.push({ label: 'DISKON', value: `- ${rupiah(transaction.discount)}` });
      }
      summaryRows.push(
        { label: 'ONGKIR', value: rupiah(transaction.shippingCost ?? 0) },
        { label: 'STATUS PEMBAYARAN', value: transaction.status },
      );

      if (transaction.status === 'Lunas') {
        const paymentMethod = transaction.paymentMethod || 'Mandiri';
        summaryRows.push({ label: 'METODE PEMBAYARAN', value: paymentMethod });
      }

      summaryRows.forEach((row) => {
        pdf.setDrawColor(LINE);
        pdf.rect(MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 9, 'S');
        setText(7.5, DARK_TEXT, 'bold');
        pdf.text(row.label, MARGIN + 4, y + 5.8);
        setText(8, DARK_TEXT, row.strong ? 'bold' : 'normal');
        pdf.text(row.value, PAGE_WIDTH - MARGIN - 4, y + 5.8, { align: 'right' });
        y += 9;
      });

      const paymentMethod = transaction.paymentMethod || 'Mandiri';
      const accountNumber = paymentMethod === 'BCA'
        ? transaction.bcaAccountNumber ?? sellerInfo.bcaAccountNumber
        : transaction.mandiriAccountNumber ?? sellerInfo.bankAccountNumber;
      const boxGap = 6;
      const boxWidth = (PAGE_WIDTH - (MARGIN * 2) - boxGap) / 2;

      pdf.setDrawColor(LINE);
      pdf.roundedRect(MARGIN, y + 3, boxWidth, 28, 1.5, 1.5, 'S');
      pdf.roundedRect(MARGIN + boxWidth + boxGap, y + 3, boxWidth, 28, 1.5, 1.5, 'S');
      setText(8, DARK_TEXT, 'bold');
      pdf.text('INFORMASI PEMBAYARAN', MARGIN + 4, y + 9);
      setText(7, MUTED, 'bold');
      pdf.text('BANK', MARGIN + 4, y + 15);
      setText(8.5, DARK_TEXT, 'bold');
      pdf.text(paymentMethod, MARGIN + 4, y + 20);
      setText(7, MUTED, 'bold');
      pdf.text('NO. REKENING', MARGIN + 4, y + 25);
      setText(8.5, DARK_TEXT, 'bold');
      pdf.text(accountNumber || 'Nomor belum diatur', MARGIN + 32, y + 25);

      const rulesX = MARGIN + boxWidth + boxGap + 4;
      setText(8, DARK_TEXT, 'bold');
      pdf.text('PERATURAN PEMBAYARAN', rulesX, y + 9);
      setText(7.2, MUTED);
      pdf.text(pdf.splitTextToSize('Pembayaran dianggap sah setelah dana diterima. Simpan bukti transfer untuk konfirmasi jika diperlukan.', boxWidth - 8), rulesX, y + 15);
      y += 35;

      pdf.setFillColor(GOLD);
      pdf.rect(MARGIN, y, 105, 13, 'F');
      pdf.setFillColor(BLACK);
      pdf.rect(MARGIN + 105, y, 81, 13, 'F');
      setText(12, BLACK, 'bold');
      pdf.text('TOTAL', MARGIN + 100, y + 8.7, { align: 'right' });
      setText(12, '#ffffff', 'bold');
      pdf.text(rupiah(transaction.total), PAGE_WIDTH - MARGIN - 4, y + 8.7, { align: 'right' });
    } else {
      setText(8, MUTED, 'bold');
      pdf.text('BERSAMBUNG KE HALAMAN BERIKUTNYA', PAGE_WIDTH - MARGIN, y + 8, { align: 'right' });
    }

    pdf.setFillColor(BLACK);
    pdf.rect(0, 278, PAGE_WIDTH, 19, 'F');
    setText(11, GOLD, 'bold');
    pdf.text('TERIMA KASIH', PAGE_WIDTH / 2, 285, { align: 'center' });
    setText(7, '#d0d0d0');
    pdf.text('Hypercard - Pokemon Trading Card', PAGE_WIDTH / 2, 290, { align: 'center' });
    setText(6.5, '#a3a3a3');
    pdf.text(`${sellerInfo.location}  |  ${sellerInfo.phone}`, PAGE_WIDTH / 2, 294, { align: 'center' });
  });

  pdf.save(filename ?? `${transaction.invoiceNumber}.pdf`);
}
