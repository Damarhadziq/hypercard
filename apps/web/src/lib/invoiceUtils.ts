import type { InvoiceItem } from '../store/useStore';

export function calculateInvoiceSubtotal(items: Pick<InvoiceItem, 'price' | 'quantity'>[]) {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

export function calculateInvoiceTotal(subtotal: number, shippingCost = 0) {
  return subtotal + Math.max(0, shippingCost);
}

export function formatPackageWeight(weight: number) {
  if (weight >= 1000) {
    const kilograms = weight / 1000;
    return `${Number.isInteger(kilograms) ? kilograms : kilograms.toLocaleString('id-ID')} kg`;
  }
  return `${weight.toLocaleString('id-ID')} gram`;
}
