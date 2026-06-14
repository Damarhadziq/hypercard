export interface InvoiceShipping {
  courier: string;
  service: string;
  description?: string;
  shippingCost: number;
  etd?: string;
  weight: number;
  origin: string;
  destination: string;
}

export const emptyInvoiceShipping = (origin = 'Semarang'): InvoiceShipping => ({
  courier: '',
  service: '',
  shippingCost: 0,
  weight: 0,
  origin,
  destination: '',
});
