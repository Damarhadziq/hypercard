import { getTransactionCustomer, type Transaction, type Product, type Customer } from '../store/useStore';

export type PeriodMode = 'month' | 'year' | 'all';

export interface ReportPeriod {
  mode: PeriodMode;
  month?: number; // 0-11
  year?: number;
}

function getPeriodLabel(period: ReportPeriod): string {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  if (period.mode === 'month' && period.month !== undefined && period.year !== undefined) {
    return `${monthNames[period.month]} ${period.year}`;
  }
  if (period.mode === 'year' && period.year !== undefined) {
    return `Tahun ${period.year}`;
  }
  return 'Semua Periode';
}

function getFilename(period: ReportPeriod): string {
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  if (period.mode === 'month' && period.month !== undefined && period.year !== undefined) {
    return `Laporan_Hypercard_${monthNames[period.month]}_${period.year}.xlsx`;
  }
  if (period.mode === 'year' && period.year !== undefined) {
    return `Laporan_Hypercard_${period.year}.xlsx`;
  }
  return 'Laporan_Hypercard_Keseluruhan.xlsx';
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: ReportPeriod
): Transaction[] {
  return transactions.filter((t) => {
    const date = new Date(t.date);
    if (period.mode === 'month' && period.month !== undefined && period.year !== undefined) {
      return date.getMonth() === period.month && date.getFullYear() === period.year;
    }
    if (period.mode === 'year' && period.year !== undefined) {
      return date.getFullYear() === period.year;
    }
    return true; // all
  });
}

export interface DashboardStats {
  omzet: number;
  paidTotal: number;
  transactionCount: number;
  completedCount: number;
  productsSold: number;
  unpaidTotal: number;
  unpaidCount: number;
  totalProfit: number;
  totalDiscount: number;
}

export function calculateStats(
  filteredTransactions: Transaction[],
  products: Product[]
): DashboardStats {
  const productMap = new Map(products.map((p) => [p.id, p]));

  let omzet = 0;
  let paidTotal = 0;
  let transactionCount = 0;
  let completedCount = 0;
  let productsSold = 0;
  let unpaidTotal = 0;
  let unpaidCount = 0;
  let totalProfit = 0;
  let totalDiscount = 0;

  for (const trx of filteredTransactions) {
    omzet += trx.total;
    transactionCount++;

    if (trx.status === 'Lunas') {
      paidTotal += trx.total;
      completedCount++;
    } else {
      unpaidTotal += trx.total;
      unpaidCount++;
    }

    totalDiscount += trx.discount;

    for (const item of trx.items) {
      productsSold += item.quantity;
      if (trx.status === 'Lunas') {
        const product = productMap.get(item.productId);
        const buyPrice = item.buyPrice ?? product?.buyPrice;
        if (buyPrice !== undefined) totalProfit += (item.price - buyPrice) * item.quantity;
      }
    }
  }

  return { omzet, paidTotal, transactionCount, completedCount, productsSold, unpaidTotal, unpaidCount, totalProfit, totalDiscount };
}

export function generateChartData(
  filteredTransactions: Transaction[],
  period: ReportPeriod
) {
  if (period.mode === 'year' || period.mode === 'all') {
    // Group by month
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    const monthMap = new Map<string, { total: number; date: string }>();

    for (const t of filteredTransactions) {
      const d = new Date(t.date);
      const key = period.mode === 'all'
        ? `${monthNames[d.getMonth()]} ${d.getFullYear()}`
        : monthNames[d.getMonth()];
      const current = monthMap.get(key);
      monthMap.set(key, {
        total: (current?.total ?? 0) + t.total,
        date: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
      });
    }

    return Array.from(monthMap.entries()).map(([name, point]) => ({
      name,
      total: point.total,
      date: point.date,
    }));
  }

  // month mode — group by day
  const dayMap = new Map<string, { total: number; date: string }>();
  for (const t of filteredTransactions) {
    const d = new Date(t.date);
    const key = `${d.getDate()}`;
    const current = dayMap.get(key);
    dayMap.set(key, {
      total: (current?.total ?? 0) + t.total,
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
    });
  }

  return Array.from(dayMap.entries())
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([name, point]) => ({ name, total: point.total, date: point.date }));
}

export async function generateExcelReport(
  transactions: Transaction[],
  products: Product[],
  customers: Customer[],
  period: ReportPeriod
): Promise<void> {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
  ]);

  const filtered = filterTransactionsByPeriod(transactions, period)
    .filter((transaction) => transaction.status === 'Lunas');
  const periodLabel = getPeriodLabel(period);
  const productMap = new Map(products.map((p) => [p.id, p]));

  const simpleWb = new ExcelJS.Workbook();
  simpleWb.creator = 'Hypercard System';
  simpleWb.created = new Date();

  const ws = simpleWb.addWorksheet('REKAP');
  ws.views = [{ showGridLines: true }];
  ws.columns = [
    { key: 'date', width: 15 },
    { key: 'item', width: 34 },
    { key: 'qty', width: 10 },
    { key: 'modal', width: 18 },
    { key: 'sold', width: 18 },
    { key: 'buyer', width: 27 },
    { key: 'paymentMethod', width: 20 },
    { key: 'spacer', width: 3 },
    { key: 'summaryLabel', width: 18 },
    { key: 'summaryValue', width: 18 },
  ];

  const simpleCurrencyFormat = '"Rp" #,##0';
  const border = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } },
  };

  ws.mergeCells('A2:G3');
  const title = ws.getCell('A2');
  title.value = `REKAP HYPERCARD - ${periodLabel.toUpperCase()}`;
  title.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  title.border = border;

  const headerRow = ws.getRow(4);
  headerRow.values = ['TANGGAL BELI', 'NAMA ITEM', 'JUMLAH', 'Harga Modal/pcs', 'Harga Sold / Pcs', 'NAMA BUYER', 'METODE PEMBAYARAN'];
  headerRow.height = 22;
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: 'FF000000' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = border;
  });

  let rowIndex = 5;
  let soldTotal = 0;
  let profitTotal = 0;
  let bcaTotal = 0;
  let mandiriTotal = 0;
  const sortedTransactions = [...filtered].sort((a, b) => (
    new Date(a.date).getTime() - new Date(b.date).getTime()
  ));

  for (const trx of sortedTransactions) {
    const customer = getTransactionCustomer(trx, customers);
    if (trx.paymentMethod === 'BCA') bcaTotal += trx.total;
    if (trx.paymentMethod === 'Mandiri') mandiriTotal += trx.total;

    for (const item of trx.items) {
      const product = productMap.get(item.productId);
      const buyPrice = item.buyPrice ?? product?.buyPrice ?? 0;
      const itemName = item.productName ?? product?.name ?? 'Produk';
      soldTotal += item.price * item.quantity;
      profitTotal += (item.price - buyPrice) * item.quantity;

      const row = ws.getRow(rowIndex);
      row.values = [
        new Date(trx.date).toLocaleDateString('id-ID'),
        itemName,
        item.quantity,
        buyPrice || '',
        item.price,
        customer.name || trx.customerName || '-',
        trx.paymentMethod || 'Tanpa metode',
      ];
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = border;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 2 ? 'left' : colNumber === 4 || colNumber === 5 ? 'right' : 'center',
        };
      });
      row.getCell(4).numFmt = simpleCurrencyFormat;
      row.getCell(5).numFmt = simpleCurrencyFormat;
      row.commit();

      rowIndex += 1;
    }
  }

  const totalRowIndex = rowIndex + 1;
  ws.getCell(`D${totalRowIndex}`).value = 'TOTAL';
  ws.getCell(`D${totalRowIndex}`).font = { bold: true };
  ws.getCell(`D${totalRowIndex}`).alignment = { horizontal: 'right' };
  ws.getCell(`E${totalRowIndex}`).value = soldTotal;
  ws.getCell(`E${totalRowIndex}`).numFmt = simpleCurrencyFormat;
  ws.getCell(`E${totalRowIndex}`).font = { bold: true };
  ws.getCell(`E${totalRowIndex}`).alignment = { horizontal: 'right' };

  const addSummaryBox = (titleRange: string, valueRange: string, titleText: string, value: number) => {
    ws.mergeCells(titleRange);
    const titleCell = ws.getCell(titleRange.split(':')[0]!);
    titleCell.value = titleText;
    titleCell.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    titleCell.border = border;

    ws.mergeCells(valueRange);
    const valueCell = ws.getCell(valueRange.split(':')[0]!);
    valueCell.value = value;
    valueCell.numFmt = simpleCurrencyFormat;
    valueCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    valueCell.alignment = { vertical: 'middle', horizontal: 'center' };
    valueCell.border = border;
  };

  addSummaryBox('I2:J3', 'I4:J4', 'TOTAL KEUNTUNGAN', profitTotal);
  addSummaryBox('I6:J6', 'I7:J7', 'TOTAL BCA', bcaTotal);
  addSummaryBox('I9:J9', 'I10:J10', 'TOTAL MANDIRI', mandiriTotal);

  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Calibri', size: cell.font?.size ?? 11, bold: cell.font?.bold, color: cell.font?.color };
    });
  });

  const simpleBuffer = await simpleWb.xlsx.writeBuffer();
  const simpleBlob = new Blob([simpleBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(simpleBlob, getFilename(period));
  return;
  /*

  // Data aggregations
  let omzet = 0;
  let totalProfit = 0;
  const transaksiCount = filtered.length;
  let invoiceLunas = 0;
  let invoiceBelumDibayar = 0;
  let produkTerjual = 0;
  let totalPiutang = 0;

  let penjualanKotorLunas = 0;
  let diskonLunas = 0;
  let hppLunas = 0;
  let ongkirLunas = 0;

  for (const t of filtered) {
    omzet += t.total;
    if (t.status === 'Lunas') {
      invoiceLunas++;
      penjualanKotorLunas += t.subtotal;
      diskonLunas += t.discount;
      ongkirLunas += t.shippingCost ?? 0;
    } else {
      invoiceBelumDibayar++;
      const paid = t.amountPaid || 0;
      totalPiutang += (t.total - paid);
    }
    
    for (const item of t.items) {
      produkTerjual += item.quantity;
      if (t.status === 'Lunas') {
        const product = productMap.get(item.productId);
        const buyPrice = item.buyPrice ?? product?.buyPrice ?? 0;
        hppLunas += buyPrice * item.quantity;
        totalProfit += (item.price - buyPrice) * item.quantity;
      }
    }
  }

  let nilaiPersediaan = 0;
  for (const p of products) {
    nilaiPersediaan += p.stock * p.buyPrice;
  }

  const averageOrderValue = invoiceLunas > 0 ? (penjualanKotorLunas / invoiceLunas) : 0;
  const pendapatanBersih = penjualanKotorLunas - diskonLunas;
  const labaKotor = pendapatanBersih - hppLunas;
  const grossMargin = pendapatanBersih > 0 ? (labaKotor / pendapatanBersih) : 0;
  const totalLabaBersih = labaKotor + ongkirLunas;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hypercard System';
  wb.created = new Date();

  // Helpers
  const currencyFormat = '_-"Rp"* #,##0_-;-"Rp"* #,##0_-;_-"Rp"* "-"_-;_-@_-';
  
  const applySectionHeaderStyle = (ws: ExcelJS.Worksheet, cellRef: string) => {
    const cell = ws.getCell(cellRef);
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  };

  const applyTableHeaderStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    row.eachCell({ includeEmpty: true }, (cell) => {
      applyBorder(cell);
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };

  const applyBorder = (cell: ExcelJS.Cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  };

  const applyCurrencyFormat = (cell: ExcelJS.Cell) => {
    cell.numFmt = currencyFormat;
    cell.alignment = { horizontal: 'right' };
  };

  const applyPercentageFormat = (cell: ExcelJS.Cell) => {
    cell.numFmt = '0.00%';
    cell.alignment = { horizontal: 'right' };
  };

  const applyStatusStyle = (cell: ExcelJS.Cell, statusType: 'payment' | 'shipping' | 'followup' | 'stock' | 'performa' | 'customer', text: string) => {
    let bgColor = 'FFFFFFFF';
    let textColor = 'FF0F172A';
    
    if (statusType === 'payment') {
      if (text === 'Lunas') {
        bgColor = 'FFDCFCE7';
        textColor = 'FF166534';
      } else if (text === 'Dibatalkan') {
        bgColor = 'FFFEE2E2';
        textColor = 'FF991B1B';
      } else {
        bgColor = 'FFFEF3C7';
        textColor = 'FF92400E';
      }
    } else if (statusType === 'shipping') {
      if (text === 'Selesai') {
        bgColor = 'FFDCFCE7';
        textColor = 'FF166534';
      } else if (text === 'Dikirim') {
        bgColor = 'FFDBEAFE';
        textColor = 'FF1E40AF';
      } else {
        bgColor = 'FFFEF3C7';
        textColor = 'FF92400E';
      }
    } else if (statusType === 'followup') {
      if (text === 'Normal') {
        bgColor = 'FFDCFCE7';
        textColor = 'FF166534';
      } else if (text === 'Prioritas Follow Up') {
        bgColor = 'FFFEE2E2';
        textColor = 'FF991B1B';
      } else {
        bgColor = 'FFFEF3C7';
        textColor = 'FF92400E';
      }
    } else if (statusType === 'stock') {
      if (text === 'Tersedia') {
        bgColor = 'FFDCFCE7';
        textColor = 'FF166534';
      } else if (text === 'Habis') {
        bgColor = 'FFFEE2E2';
        textColor = 'FF991B1B';
      } else {
        bgColor = 'FFFEF3C7';
        textColor = 'FF92400E';
      }
    } else if (statusType === 'performa') {
      if (text === 'Best Seller') {
        bgColor = 'FFDCFCE7';
        textColor = 'FF166534';
      } else if (text === 'Slow Moving') {
        bgColor = 'FFFEE2E2';
        textColor = 'FF991B1B';
      } else {
        bgColor = 'FFFEF3C7';
        textColor = 'FF92400E';
      }
    } else if (statusType === 'customer') {
      if (text === 'VIP Buyer') {
        bgColor = 'FFDCFCE7';
        textColor = 'FF166534';
      } else if (text === 'Repeat Buyer') {
        bgColor = 'FFDBEAFE';
        textColor = 'FF1E40AF';
      } else {
        bgColor = 'FFFEF3C7';
        textColor = 'FF92400E';
      }
    }

    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { color: { argb: textColor }, bold: true };
    applyBorder(cell);
    cell.alignment = { horizontal: 'center' };
  };

  const setColumnWidths = (ws: ExcelJS.Worksheet, widths: number[]) => {
    widths.forEach((w, i) => {
      ws.getColumn(i + 1).width = w;
    });
  };

  const addAutoFilter = (ws: ExcelJS.Worksheet, range: string) => {
    ws.autoFilter = range;
  };

  // ──────────────────────────────────────────────────────────
  // Sheet 1: Executive Summary
  // ──────────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet('Executive Summary');
  ws1.views = [{ showGridLines: false }];
  setColumnWidths(ws1, [2, 25, 20, 2, 25, 20, 2, 25]);
  
  // Header
  ws1.mergeCells('B2:H3');
  const titleCell = ws1.getCell('B2');
  titleCell.value = 'HYPERCARD POKEMON TRADING CARD';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.mergeCells('B4:H4');
  const subTitleCell = ws1.getCell('B4');
  subTitleCell.value = 'Monthly Sales & Financial Report';
  subTitleCell.font = { italic: true, size: 12, color: { argb: 'FF0F172A' } };
  subTitleCell.alignment = { horizontal: 'center' };

  ws1.getCell('B6').value = `Periode: ${periodLabel}`;
  ws1.getCell('B6').font = { bold: true };
  ws1.getCell('B7').value = `Generated at: ${new Date().toLocaleDateString('id-ID')}`;
  ws1.getCell('B7').font = { italic: true };

  // KPI Cards function
  const createKpiCard = (cellTitle: string, cellVal: string, titleStr: string, val: number | string, isCurrency = true) => {
    ws1.mergeCells(cellTitle);
    ws1.mergeCells(cellVal);
    const tc = ws1.getCell(cellTitle.split(':')[0]);
    const vc = ws1.getCell(cellVal.split(':')[0]);
    
    tc.value = titleStr;
    tc.font = { bold: true, color: { argb: 'FF0F172A' } };
    tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    applyBorder(tc);
    tc.alignment = { vertical: 'middle', horizontal: 'center' };
    
    vc.value = val;
    vc.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    applyBorder(vc);
    vc.alignment = { vertical: 'middle', horizontal: 'center' };
    
    if (isCurrency && typeof val === 'number') {
      vc.numFmt = currencyFormat;
    }
  };

  createKpiCard('B9:C9', 'B10:C11', 'Total Omzet', omzet, true);
  createKpiCard('E9:F9', 'E10:F11', 'Total Profit', totalProfit, true);
  createKpiCard('B13:C13', 'B14:C15', 'Total Transaksi', transaksiCount, false);
  createKpiCard('E13:F13', 'E14:F15', 'Invoice Lunas', invoiceLunas, false);
  createKpiCard('B17:C17', 'B18:C19', 'Invoice Belum Dibayar', invoiceBelumDibayar, false);
  createKpiCard('E17:F17', 'E18:F19', 'Produk Terjual', produkTerjual, false);
  createKpiCard('B21:C21', 'B22:C23', 'Total Piutang', totalPiutang, true);
  createKpiCard('E21:F21', 'E22:F23', 'Nilai Persediaan', nilaiPersediaan, true);

  // Financial Position
  ws1.mergeCells('H9:H9');
  ws1.getCell('H9').value = 'Financial Position';
  applySectionHeaderStyle(ws1, 'H9');
  ws1.getCell('H10').value = 'Piutang Usaha';
  ws1.getCell('H11').value = totalPiutang;
  applyCurrencyFormat(ws1.getCell('H11'));
  ws1.getCell('H12').value = 'Nilai Persediaan';
  ws1.getCell('H13').value = nilaiPersediaan;
  applyCurrencyFormat(ws1.getCell('H13'));
  ws1.getCell('H14').value = 'Total Aset Tercatat';
  ws1.getCell('H14').font = { bold: true };
  ws1.getCell('H15').value = totalPiutang + nilaiPersediaan;
  ws1.getCell('H15').font = { bold: true };
  applyCurrencyFormat(ws1.getCell('H15'));
  
  for(let i=9; i<=15; i++) {
    applyBorder(ws1.getCell(`H${i}`));
  }

  // Sales Metrics
  ws1.mergeCells('H17:H17');
  ws1.getCell('H17').value = 'Sales Metrics';
  applySectionHeaderStyle(ws1, 'H17');
  ws1.getCell('H18').value = 'Total Transaksi Selesai';
  ws1.getCell('H19').value = invoiceLunas;
  ws1.getCell('H19').alignment = { horizontal: 'right' };
  ws1.getCell('H20').value = 'Total Unit Produk Terjual';
  ws1.getCell('H21').value = produkTerjual;
  ws1.getCell('H21').alignment = { horizontal: 'right' };
  ws1.getCell('H22').value = 'Average Order Value';
  ws1.getCell('H23').value = averageOrderValue;
  applyCurrencyFormat(ws1.getCell('H23'));
  ws1.getCell('H24').value = 'Gross Margin %';
  ws1.getCell('H25').value = grossMargin;
  applyPercentageFormat(ws1.getCell('H25'));
  
  for(let i=17; i<=25; i++) {
    applyBorder(ws1.getCell(`H${i}`));
  }

  // Recent Transactions
  ws1.mergeCells('B26:H26');
  ws1.getCell('B26').value = '5 Transaksi Terbaru';
  applySectionHeaderStyle(ws1, 'B26');
  
  ws1.getCell('B27').value = 'Tanggal';
  ws1.getCell('C27').value = 'No Invoice';
  ws1.getCell('D27').value = 'Pembeli';
  ws1.getCell('E27').value = 'Total';
  ws1.getCell('F27').value = 'Status Pembayaran';
  ws1.mergeCells('F27:H27');
  applyTableHeaderStyle(ws1.getRow(27));

  let rIdx = 28;
  const recentTransactions = [...filtered]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  recentTransactions.forEach((trx) => {
    ws1.getCell(`B${rIdx}`).value = new Date(trx.date).toLocaleDateString('id-ID');
    ws1.getCell(`C${rIdx}`).value = trx.invoiceNumber;
    ws1.getCell(`D${rIdx}`).value = getTransactionCustomer(trx, customers).name;
    ws1.getCell(`E${rIdx}`).value = trx.total;
    applyCurrencyFormat(ws1.getCell(`E${rIdx}`));
    ws1.mergeCells(`F${rIdx}:H${rIdx}`);
    ws1.getCell(`F${rIdx}`).value = trx.status;
    applyStatusStyle(ws1.getCell(`F${rIdx}`), 'payment', trx.status);
    
    ['B','C','D','E'].forEach(col => {
      applyBorder(ws1.getCell(`${col}${rIdx}`));
    });
    rIdx++;
  });


  // ──────────────────────────────────────────────────────────
  // Sheet 2: Buku Besar Transaksi
  // ──────────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Buku Besar Transaksi');
  setColumnWidths(ws2, [5, 15, 20, 25, 15, 30, 25, 8, 15, 15, 15, 15, 15, 15, 15, 20, 20, 15, 20, 15, 15, 30]);

  const ws2Headers = [
    'No', 'Tanggal', 'No Invoice', 'Nama Pembeli', 'No HP', 'Alamat', 
    'Produk', 'Qty', 'Harga Jual', 'Harga Modal', 'Subtotal', 
    'Ongkir', 'Diskon', 'Grand Total', 'Profit', 
    'Status Pembayaran', 'Status Pengiriman', 'Kurir', 'No Resi', 
    'Tanggal Lunas', 'Tanggal Kirim', 'Catatan'
  ];
  ws2.addRow(ws2Headers);
  applyTableHeaderStyle(ws2.getRow(1));
  addAutoFilter(ws2, 'A1:V1');
  ws2.views = [{ state: 'frozen', ySplit: 1 }];

  let noTx = 1;
  let sumOmzet2 = 0;
  let sumProfit2 = 0;

  for (const trx of filtered) {
    const customer = getTransactionCustomer(trx, customers);
    for (const item of trx.items) {
      const product = productMap.get(item.productId);
      const buyPrice = item.buyPrice ?? product?.buyPrice ?? 0;
      const subtotalItem = item.price * item.quantity;
      const itemModal = buyPrice * item.quantity;
      const itemProfit = subtotalItem - itemModal;
      
      sumOmzet2 += subtotalItem;
      sumProfit2 += itemProfit;

      const row = ws2.addRow([
        noTx++,
        new Date(trx.date).toLocaleDateString('id-ID'),
        trx.invoiceNumber,
        customer.name,
        customer.phone || '-',
        customer.address || '-',
        item.productName ?? product?.name ?? 'Produk',
        item.quantity,
        item.price,
        buyPrice,
        subtotalItem,
        trx.shippingCost ?? 0,
        trx.discount ?? 0,
        trx.total,
        itemProfit,
        trx.status,
        trx.shippingStatus || '-',
        trx.courier || '-',
        trx.trackingNumber || '-',
        trx.paidAt ? new Date(trx.paidAt).toLocaleDateString('id-ID') : '-',
        trx.shippedAt ? new Date(trx.shippedAt).toLocaleDateString('id-ID') : '-',
        trx.notes || '-'
      ]);

      [9, 10, 11, 12, 13, 14, 15].forEach(col => applyCurrencyFormat(row.getCell(col)));
      applyStatusStyle(row.getCell(16), 'payment', trx.status);
      if(trx.shippingStatus) applyStatusStyle(row.getCell(17), 'shipping', trx.shippingStatus);
      
      row.eachCell({ includeEmpty: true }, (cell) => applyBorder(cell));
    }
  }

  const ws2TotalRow = ws2.addRow(['', '', '', '', '', '', 'TOTAL', '', '', '', sumOmzet2, '', '', '', sumProfit2]);
  ws2TotalRow.font = { bold: true };
  applyCurrencyFormat(ws2TotalRow.getCell(11));
  applyCurrencyFormat(ws2TotalRow.getCell(15));
  ws2TotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if(colNumber <= 15) applyBorder(cell);
  });


  // ──────────────────────────────────────────────────────────
  // Sheet 3: Laba Rugi
  // ──────────────────────────────────────────────────────────
  const ws3 = wb.addWorksheet('Laba Rugi');
  ws3.views = [{ showGridLines: false }];
  setColumnWidths(ws3, [5, 40, 25]);
  
  ws3.getCell('B2').value = 'LAPORAN LABA RUGI';
  ws3.getCell('B2').font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
  ws3.getCell('B3').value = `Periode: ${periodLabel}`;

  const addLrRow = (title: string, amount: number | null, isBold = false, isHeader = false) => {
    const r = ws3.addRow(['', title, amount]);
    if (amount !== null) applyCurrencyFormat(r.getCell(3));
    if (isBold) r.font = { bold: true, color: { argb: 'FF0F172A' } };
    if (isHeader) {
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      r.font = { bold: true, color: { argb: 'FF0F172A' } };
      applyBorder(r.getCell(2));
      applyBorder(r.getCell(3));
    }
    return r;
  };

  ws3.addRow([]);
  addLrRow('Pendapatan', null, true, true);
  addLrRow('Penjualan Kotor', penjualanKotorLunas);
  addLrRow('Diskon Penjualan', -diskonLunas);
  const rBersih = addLrRow('Penjualan Bersih', pendapatanBersih, true);
  rBersih.getCell(3).border = { top: { style: 'thin' } };

  ws3.addRow([]);
  addLrRow('Harga Pokok Penjualan', null, true, true);
  addLrRow('Modal Barang Terjual', hppLunas);
  const rLabaKotor = addLrRow('Laba Kotor', labaKotor, true);
  rLabaKotor.getCell(3).border = { top: { style: 'thin' } };

  ws3.addRow([]);
  addLrRow('Biaya Operasional', null, true, true);
  addLrRow('Ongkir Ditanggung Seller (Belum dicatat)', 0);
  addLrRow('Biaya Packaging (Belum dicatat)', 0);
  addLrRow('Biaya Admin (Belum dicatat)', 0);
  addLrRow('Biaya Lain-lain (Belum dicatat)', 0);
  
  ws3.addRow([]);
  const rLabaBersih = addLrRow('Laba Bersih', totalLabaBersih, true);
  rLabaBersih.getCell(2).font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
  rLabaBersih.getCell(3).font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
  rLabaBersih.getCell(3).border = { top: { style: 'thick' }, bottom: { style: 'double' } };

  ws3.addRow([]);
  const netMargin = pendapatanBersih > 0 ? (totalLabaBersih / pendapatanBersih) : 0;
  addLrRow('Gross Margin %', grossMargin).getCell(3).numFmt = '0.00%';
  addLrRow('Net Margin %', netMargin).getCell(3).numFmt = '0.00%';


  // ──────────────────────────────────────────────────────────
  // Sheet 4: Piutang Invoice
  // ──────────────────────────────────────────────────────────
  const ws4 = wb.addWorksheet('Piutang Invoice');
  setColumnWidths(ws4, [5, 15, 20, 25, 15, 20, 20, 20, 15, 20, 30]);

  const ws4Headers = ['No', 'Tanggal Invoice', 'No Invoice', 'Nama Pembeli', 'No HP', 'Total Tagihan', 'Jumlah Dibayar', 'Sisa Piutang', 'Umur Piutang', 'Status Follow Up', 'Catatan'];
  ws4.addRow(ws4Headers);
  applyTableHeaderStyle(ws4.getRow(1));
  addAutoFilter(ws4, 'A1:K1');
  ws4.views = [{ state: 'frozen', ySplit: 1 }];

  let noPiutang = 1;
  const unpaidInvoices = filtered.filter(t => t.status !== 'Lunas' && t.status !== 'Dibatalkan');
  
  if (unpaidInvoices.length === 0) {
    ws4.addRow(['Tidak ada invoice belum lunas pada periode ini.']);
    ws4.mergeCells('A2:K2');
    ws4.getCell('A2').alignment = { horizontal: 'center' };
  } else {
    for (const trx of unpaidInvoices) {
      const customer = getTransactionCustomer(trx, customers);
      const dibayar = trx.amountPaid || 0;
      const sisa = trx.total - dibayar;
      const dInv = new Date(trx.date);
      const dNow = new Date();
      const diffTime = Math.abs(dNow.getTime() - dInv.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let followUp = 'Normal';
      if (diffDays >= 4 && diffDays <= 7) followUp = 'Perlu Follow Up';
      else if (diffDays > 7) followUp = 'Prioritas Follow Up';

      const row = ws4.addRow([
        noPiutang++,
        dInv.toLocaleDateString('id-ID'),
        trx.invoiceNumber,
        customer.name,
        customer.phone || '-',
        trx.total,
        dibayar,
        sisa,
        `${diffDays} Hari`,
        followUp,
        trx.notes || '-'
      ]);

      applyCurrencyFormat(row.getCell(6));
      applyCurrencyFormat(row.getCell(7));
      applyCurrencyFormat(row.getCell(8));
      applyStatusStyle(row.getCell(10), 'followup', followUp);
      
      row.eachCell({ includeEmpty: true }, (cell) => applyBorder(cell));
    }
  }


  // ──────────────────────────────────────────────────────────
  // Sheet 5: Analisis Produk
  // ──────────────────────────────────────────────────────────
  const ws5 = wb.addWorksheet('Analisis Produk');
  setColumnWidths(ws5, [5, 15, 30, 20, 15, 20, 20, 20, 15, 20]);

  const ws5Headers = ['No', 'Kode Produk', 'Nama Produk', 'Kategori', 'Qty Terjual', 'Omzet', 'Modal', 'Profit', 'Margin %', 'Status Performa'];
  ws5.addRow(ws5Headers);
  applyTableHeaderStyle(ws5.getRow(1));
  addAutoFilter(ws5, 'A1:J1');
  ws5.views = [{ state: 'frozen', ySplit: 1 }];

  const prodAnalysis = new Map<string, {name:string, cat:string, qty:number, omzet:number, modal:number}>();
  
  for (const t of filtered) {
    if (t.status === 'Lunas') {
      for (const item of t.items) {
        const product = productMap.get(item.productId);
        const buyPrice = item.buyPrice ?? product?.buyPrice ?? 0;
        const ex = prodAnalysis.get(item.productId);
        const rev = item.price * item.quantity;
        const cost = buyPrice * item.quantity;
        if (ex) {
          ex.qty += item.quantity; ex.omzet += rev; ex.modal += cost;
        } else {
          prodAnalysis.set(item.productId, {
            name: item.productName ?? product?.name ?? 'Produk',
            cat: item.productCategory ?? product?.category ?? '-',
            qty: item.quantity, omzet: rev, modal: cost
          });
        }
      }
    }
  }

  const sortedAnalisis = Array.from(prodAnalysis.entries()).sort((a,b) => b[1].qty - a[1].qty);
  let noProd = 1;
  for (const [id, data] of sortedAnalisis) {
    const profit = data.omzet - data.modal;
    const margin = data.omzet > 0 ? (profit / data.omzet) : 0;
    
    let performa = 'Slow Moving';
    if (data.qty >= 5) performa = 'Best Seller';
    else if (data.qty >= 2) performa = 'Good';

    const row = ws5.addRow([
      noProd++,
      id.substring(0,8),
      data.name,
      data.cat,
      data.qty,
      data.omzet,
      data.modal,
      profit,
      margin,
      performa
    ]);

    applyCurrencyFormat(row.getCell(6));
    applyCurrencyFormat(row.getCell(7));
    applyCurrencyFormat(row.getCell(8));
    applyPercentageFormat(row.getCell(9));
    applyStatusStyle(row.getCell(10), 'performa', performa);
    
    row.eachCell({ includeEmpty: true }, (cell) => applyBorder(cell));
  }


  // ──────────────────────────────────────────────────────────
  // Sheet 6: Master Produk
  // ──────────────────────────────────────────────────────────
  const ws6 = wb.addWorksheet('Master Produk');
  setColumnWidths(ws6, [5, 15, 30, 20, 15, 15, 15, 20, 20, 10, 20, 15, 25]);

  const ws6Headers = ['No', 'Kode Produk', 'Nama Produk', 'Kategori', 'Series', 'Rarity', 'Condition', 'Harga Modal', 'Harga Jual', 'Stok', 'Nilai Persediaan', 'Status Stok', 'Catatan'];
  ws6.addRow(ws6Headers);
  applyTableHeaderStyle(ws6.getRow(1));
  addAutoFilter(ws6, 'A1:M1');
  ws6.views = [{ state: 'frozen', ySplit: 1 }];

  let noMP = 1;
  for (const p of products) {
    const nilai = p.stock * p.buyPrice;
    let stokStat = 'Tersedia';
    if (p.stock === 0) stokStat = 'Habis';
    else if (p.stock <= 2) stokStat = 'Rendah';

    const row = ws6.addRow([
      noMP++,
      p.id.substring(0,8),
      p.name,
      p.category || '-',
      p.series || '-',
      p.rarity || '-',
      p.condition || '-',
      p.buyPrice,
      p.sellPrice,
      p.stock,
      nilai,
      stokStat,
      p.notes || '-'
    ]);

    applyCurrencyFormat(row.getCell(8));
    applyCurrencyFormat(row.getCell(9));
    applyCurrencyFormat(row.getCell(11));
    applyStatusStyle(row.getCell(12), 'stock', stokStat);
    
    row.eachCell({ includeEmpty: true }, (cell) => applyBorder(cell));
  }


  // ──────────────────────────────────────────────────────────
  // Sheet 7: Master Pembeli
  // ──────────────────────────────────────────────────────────
  const ws7 = wb.addWorksheet('Master Pembeli');
  setColumnWidths(ws7, [5, 25, 20, 30, 15, 15, 15, 20, 15, 25]);

  const ws7Headers = ['No', 'Nama Pembeli', 'No HP', 'Alamat', 'Kota', 'Kode Pos', 'Total Transaksi', 'Total Pembelian', 'Status Customer', 'Catatan'];
  ws7.addRow(ws7Headers);
  applyTableHeaderStyle(ws7.getRow(1));
  addAutoFilter(ws7, 'A1:J1');
  ws7.views = [{ state: 'frozen', ySplit: 1 }];

  const buyerStats = new Map<string, {txCount:number, totalBuy:number}>();
  // Count from all transactions, not just filtered ones, to give a real lifetime value, but prompt didn't specify.
  // "Total Transaksi dihitung dari transaksi buyer tersebut". 
  // We'll calculate it from all transactions passed to avoid period limitation on "Master Pembeli" if they want total lifetime.
  for (const t of transactions) {
    if(t.status === 'Lunas') {
      const bId = t.customerId || t.customer?.id;
      if (bId) {
        const ex = buyerStats.get(bId) || {txCount:0, totalBuy:0};
        ex.txCount += 1;
        ex.totalBuy += t.total;
        buyerStats.set(bId, ex);
      }
    }
  }

  let noCust = 1;
  for (const c of customers) {
    const stat = buyerStats.get(c.id) || {txCount:0, totalBuy:0};
    
    let cStat = 'New Buyer';
    if (stat.txCount >= 5) cStat = 'VIP Buyer';
    else if (stat.txCount >= 2) cStat = 'Repeat Buyer';

    const row = ws7.addRow([
      noCust++,
      c.name,
      c.phone || '-',
      c.address || '-',
      c.city || '-',
      c.postalCode || '-',
      stat.txCount,
      stat.totalBuy,
      cStat,
      c.notes || '-'
    ]);

    applyCurrencyFormat(row.getCell(8));
    applyStatusStyle(row.getCell(9), 'customer', cStat);
    
    row.eachCell({ includeEmpty: true }, (cell) => applyBorder(cell));
  }

  // ──────────────────────────────────────────────────────────
  // Generate file
  // ──────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, getFilename(period));
  */
}
