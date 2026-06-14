import type { AdminUser, Customer, InvoiceItem, Product, Transaction } from '../store/useStore';

export type ProductInput = Omit<Product, 'id'>;
export type ProductUpdateInput = Partial<ProductInput>;

export type CustomerInput = Omit<Customer, 'id'>;
export type CustomerUpdateInput = Partial<CustomerInput>;

export interface AdminInput {
  name: AdminUser['name'];
  email: AdminUser['email'];
  password: string;
}

export interface CreateTransactionInput {
  customerId: string;
  items: Pick<InvoiceItem, 'productId' | 'quantity' | 'price'>[];
  subtotal: number;
  shippingCost?: number;
  shippingCourier?: string;
  shippingService?: string;
  shippingDescription?: string;
  shippingEtd?: string;
  shippingWeight?: number;
  shippingOrigin?: string;
  shippingDestination?: string;
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

export interface DashboardReportSummary {
  current: {
    totalSold: number;
    totalItems: number;
    totalProfit: number;
    customerCount: number;
    costBreakdown: {
      revenue: number;
      capitalCost: number;
      sellerShippingCost: number;
      totalCost: number;
      netProfit: number;
      netMargin: number;
    };
  };
  previous: DashboardReportSummary['current'];
  hasCurrentData: boolean;
  hasPreviousData: boolean;
  chart: {
    date: number;
    sold: number;
    profit: number;
  }[];
  topSpend: {
    id: string;
    name: string;
    spend: number;
    orders: number;
  }[];
  availableYears: number[];
}

export type { AdminUser, Customer, Product, Transaction };
