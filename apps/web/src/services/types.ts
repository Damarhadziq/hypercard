import type { AdminUser, Customer, InvoiceItem, Product, Transaction } from '../store/useStore';

export type ProductInput = Omit<Product, 'id'>;
export type ProductUpdateInput = Partial<ProductInput>;

export type CustomerInput = Omit<Customer, 'id'>;
export type CustomerUpdateInput = Partial<CustomerInput>;

export type AdminInput = Pick<AdminUser, 'name' | 'email' | 'password'>;

export interface CreateTransactionInput {
  customerId: string;
  items: Pick<InvoiceItem, 'productId' | 'quantity' | 'price'>[];
  subtotal: number;
  discount: number;
  shippingCost?: number;
  total: number;
  paymentMethod?: Transaction['paymentMethod'];
  mandiriAccountNumber?: string;
  mandiriAccountHolder?: string;
  bcaAccountNumber?: string;
  bcaAccountHolder?: string;
  notes?: string;
  date?: string;
}

export interface UpdateTransactionStatusInput {
  status: Transaction['status'];
  paymentMethod?: Transaction['paymentMethod'];
  mandiriAccountNumber?: string;
  mandiriAccountHolder?: string;
  bcaAccountNumber?: string;
  bcaAccountHolder?: string;
}

export interface DashboardStats {
  omzet: number;
  transactionCount: number;
  productsSold: number;
  unpaidTotal: number;
  unpaidCount: number;
}

export interface DashboardChartPoint {
  name: string;
  total: number;
}

export interface DashboardReportRow {
  id: string;
  transactionId: string;
  date: string;
  itemName: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  buyerName: string;
}

export type { AdminUser, Customer, Product, Transaction };
