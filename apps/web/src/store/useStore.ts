import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  category: string;
  series?: string;
  condition: string;
  setName?: string;
  rarity?: string;
  language?: string;
  cardNumber?: string;
  finish?: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  image?: string;
  notes?: string;
  sourceCardId?: string;
  sourceCardUrl?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city?: string;
  postalCode: string;
  notes?: string;
  history?: string;
}

export interface InvoiceItem {
  productId: string;
  quantity: number;
  price: number;
  productName?: string;
  productCategory?: string;
  productCondition?: string;
  productSetName?: string;
  productRarity?: string;
  productLanguage?: string;
  productCardNumber?: string;
  productImage?: string;
  buyPrice?: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerPostalCode?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  shippingCourier?: string;
  shippingService?: string;
  shippingDescription?: string;
  shippingEtd?: string;
  shippingWeight?: number;
  shippingOrigin?: string;
  shippingDestination?: string;
  total: number;
  status: 'Lunas' | 'Belum Dibayar' | 'Dibatalkan';
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
  shippingStatus?: string;
  courier?: string;
  trackingNumber?: string;
  paidAt?: string;
  shippedAt?: string;
  mandiriAccountNumber?: string;
  mandiriAccountHolder?: string;
  bcaAccountNumber?: string;
  bcaAccountHolder?: string;
  date: string;
  createdAt?: string;
  notes?: string;
  inventoryAdjusted?: boolean;
  customer?: Customer;
}

export interface SellerInfo {
  name: string;
  phone: string;
  location: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  bcaAccountNumber: string;
  bcaAccountHolder: string;
}

export type PaymentMethod = 'Mandiri' | 'BCA' | 'Lainnya';

export type UserRole = 'superadmin' | 'admin';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

const defaultProducts: Product[] = [
  {
    id: '1', name: 'Pikachu Promo', category: 'Promo Card', condition: 'Mint',
    setName: 'Scarlet & Violet Promo', rarity: 'Promo', language: 'Japanese',
    cardNumber: 'SV-P 001', finish: 'Holo', buyPrice: 150000, sellPrice: 250000, stock: 3,
  },
  {
    id: '2', name: 'Charizard VMAX', category: 'Single Card', condition: 'Near Mint',
    setName: 'Shining Fates', rarity: 'Ultra Rare', language: 'English',
    cardNumber: 'SV107/SV122', finish: 'Full Art', buyPrice: 850000, sellPrice: 1200000, stock: 2,
  },
  {
    id: 'demo-3', name: 'Mew ex', category: 'Single Card', condition: 'Near Mint',
    setName: 'Paldean Fates', rarity: 'Special Illustration Rare', language: 'English',
    cardNumber: '232/091', finish: 'Holo', buyPrice: 980000, sellPrice: 1350000, stock: 1,
  },
  {
    id: 'demo-4', name: 'Umbreon V', category: 'Single Card', condition: 'Excellent',
    setName: 'Evolving Skies', rarity: 'Ultra Rare', language: 'Japanese',
    cardNumber: '085/069', finish: 'Full Art', buyPrice: 1750000, sellPrice: 2250000, stock: 1,
  },
  {
    id: 'demo-5', name: 'Iono', category: 'Single Card', condition: 'Near Mint',
    setName: 'Paldea Evolved', rarity: 'Special Illustration Rare', language: 'Indonesian',
    cardNumber: '269/193', finish: 'Holo', buyPrice: 450000, sellPrice: 625000, stock: 4,
  },
  {
    id: 'demo-6', name: '151 Booster Pack', category: 'Booster Pack', condition: 'Mint',
    setName: 'Scarlet & Violet—151', rarity: 'Sealed Product', language: 'English',
    cardNumber: '', finish: 'Sealed', buyPrice: 95000, sellPrice: 135000, stock: 12,
  },
];

const defaultCustomers: Customer[] = [
  { id: '1', name: 'Hendri Suntono', phone: '08123456789', address: 'Kalideres, Jakarta Barat', postalCode: '11840', history: 'Pernah beli Pikachu Promo' },
  { id: 'demo-c2', name: 'Nadia Putri', phone: '081298765432', address: 'Tembalang, Semarang', postalCode: '50275', history: 'Kolektor kartu illustration rare' },
  { id: 'demo-c3', name: 'Rizky Pratama', phone: '085712340987', address: 'Sleman, Yogyakarta', postalCode: '55581', history: 'Pelanggan booster pack' },
  { id: 'demo-c4', name: 'Kevin Wijaya', phone: '087812223333', address: 'Surabaya Barat, Surabaya', postalCode: '60226', history: 'Mengutamakan kartu kondisi Near Mint' },
];

const defaultTransactions: Transaction[] = [
  {
    id: '1', invoiceNumber: 'INV-2026-001', customerId: '1',
    items: [{ productId: '1', quantity: 1, price: 250000 }],
    subtotal: 250000, discount: 0, shippingCost: 0, total: 250000,
    status: 'Lunas', date: '2026-06-02T09:15:00.000Z',
  },
  {
    id: 'demo-t2', invoiceNumber: 'INV-2026-002', customerId: 'demo-c2',
    items: [{ productId: 'demo-3', quantity: 1, price: 1350000 }],
    subtotal: 1350000, discount: 50000, shippingCost: 0, total: 1300000,
    status: 'Lunas', date: '2026-06-04T06:40:00.000Z',
  },
  {
    id: 'demo-t3', invoiceNumber: 'INV-2026-003', customerId: 'demo-c3',
    items: [{ productId: 'demo-6', quantity: 3, price: 135000 }],
    subtotal: 405000, discount: 0, shippingCost: 0, total: 405000,
    status: 'Belum Dibayar', date: '2026-06-06T11:20:00.000Z',
  },
  {
    id: 'demo-t4', invoiceNumber: 'INV-2026-004', customerId: 'demo-c4',
    items: [{ productId: '2', quantity: 1, price: 1200000 }, { productId: 'demo-5', quantity: 1, price: 625000 }],
    subtotal: 1825000, discount: 25000, shippingCost: 0, total: 1800000,
    status: 'Belum Dibayar', date: '2026-06-08T04:10:00.000Z',
  },
  {
    id: 'demo-t5', invoiceNumber: 'INV-2026-005', customerId: 'demo-c3',
    items: [{ productId: 'demo-6', quantity: 2, price: 135000 }],
    subtotal: 270000, discount: 0, shippingCost: 0, total: 270000,
    status: 'Lunas', date: '2026-06-03T03:35:00.000Z',
  },
  {
    id: 'demo-t6', invoiceNumber: 'INV-2026-006', customerId: 'demo-c4',
    items: [{ productId: 'demo-5', quantity: 1, price: 625000 }],
    subtotal: 625000, discount: 0, shippingCost: 15000, total: 640000,
    status: 'Lunas', date: '2026-06-05T08:05:00.000Z',
  },
  {
    id: 'demo-t7', invoiceNumber: 'INV-2026-007', customerId: '1',
    items: [{ productId: '2', quantity: 1, price: 1200000 }],
    subtotal: 1200000, discount: 100000, shippingCost: 0, total: 1100000,
    status: 'Lunas', date: '2026-06-06T12:25:00.000Z',
  },
  {
    id: 'demo-t8', invoiceNumber: 'INV-2026-008', customerId: 'demo-c2',
    items: [{ productId: '1', quantity: 1, price: 250000 }, { productId: 'demo-6', quantity: 4, price: 135000 }],
    subtotal: 790000, discount: 0, shippingCost: 0, total: 790000,
    status: 'Lunas', date: '2026-06-07T05:50:00.000Z',
  },
  {
    id: 'demo-t9', invoiceNumber: 'INV-2026-009', customerId: 'demo-c3',
    items: [{ productId: 'demo-3', quantity: 1, price: 1350000 }],
    subtotal: 1350000, discount: 0, shippingCost: 0, total: 1350000,
    status: 'Lunas', date: '2026-06-08T10:30:00.000Z',
  },
  {
    id: 'demo-t10', invoiceNumber: 'INV-2026-010', customerId: 'demo-c4',
    items: [{ productId: 'demo-6', quantity: 1, price: 135000 }],
    subtotal: 135000, discount: 0, shippingCost: 10000, total: 145000,
    status: 'Lunas', date: '2026-06-09T06:15:00.000Z',
  },
  {
    id: 'demo-t11', invoiceNumber: 'INV-2026-011', customerId: '1',
    items: [{ productId: 'demo-5', quantity: 2, price: 625000 }],
    subtotal: 1250000, discount: 75000, shippingCost: 0, total: 1175000,
    status: 'Lunas', date: '2026-06-10T02:45:00.000Z',
  },
  {
    id: 'demo-t12', invoiceNumber: 'INV-2026-012', customerId: 'demo-c2',
    items: [{ productId: 'demo-6', quantity: 5, price: 135000 }],
    subtotal: 675000, discount: 25000, shippingCost: 0, total: 650000,
    status: 'Lunas', date: '2026-06-12T07:55:00.000Z',
  },
  {
    id: 'demo-t13', invoiceNumber: 'INV-2026-013', customerId: 'demo-c3',
    items: [{ productId: '1', quantity: 1, price: 250000 }],
    subtotal: 250000, discount: 0, shippingCost: 0, total: 250000,
    status: 'Lunas', date: '2026-06-14T09:20:00.000Z',
  },
  {
    id: 'demo-t14', invoiceNumber: 'INV-2026-014', customerId: 'demo-c4',
    items: [{ productId: 'demo-3', quantity: 1, price: 1350000 }, { productId: 'demo-6', quantity: 2, price: 135000 }],
    subtotal: 1620000, discount: 120000, shippingCost: 0, total: 1500000,
    status: 'Lunas', date: '2026-06-16T11:05:00.000Z',
  },
];

function createInvoiceItemSnapshot(item: InvoiceItem, products: Product[]): InvoiceItem {
  if (item.productName) return item;
  const product = products.find((candidate) => candidate.id === item.productId)
    ?? defaultProducts.find((candidate) => candidate.id === item.productId);

  if (!product) return item;

  return {
    ...item,
    productName: product.name,
    productCategory: product.category,
    productCondition: product.condition,
    productSetName: product.setName,
    productRarity: product.rarity,
    productLanguage: product.language,
    productCardNumber: product.cardNumber,
    productImage: product.image,
    buyPrice: product.buyPrice,
  };
}

function createTransactionSnapshot(
  transaction: Transaction,
  products: Product[],
  customers: Customer[],
): Transaction {
  const customer = customers.find((candidate) => candidate.id === transaction.customerId)
    ?? defaultCustomers.find((candidate) => candidate.id === transaction.customerId);

  return {
    ...transaction,
    customerName: transaction.customerName || customer?.name,
    customerPhone: transaction.customerPhone ?? customer?.phone,
    customerAddress: transaction.customerAddress ?? customer?.address,
    customerPostalCode: transaction.customerPostalCode ?? customer?.postalCode,
    items: transaction.items.map((item) => createInvoiceItemSnapshot(item, products)),
  };
}

export function getTransactionCustomer(
  transaction: Transaction,
  customers: Customer[],
): Pick<Customer, 'name' | 'phone' | 'address' | 'postalCode'> {
  const currentCustomer = customers.find((customer) => customer.id === transaction.customerId);

  return {
    name: transaction.customerName || currentCustomer?.name || 'Pembeli dihapus',
    phone: transaction.customerPhone ?? currentCustomer?.phone ?? '-',
    address: transaction.customerAddress ?? currentCustomer?.address ?? '-',
    postalCode: transaction.customerPostalCode ?? currentCustomer?.postalCode ?? '-',
  };
}

const productSpecsByName: Record<string, Partial<Product>> = {
  pikachu: {
    setName: 'Scarlet & Violet Promo',
    rarity: 'Promo',
    language: 'Japanese',
    cardNumber: 'SV-P 001',
    finish: 'Holo',
  },
  charizard: {
    setName: 'Shining Fates',
    rarity: 'Ultra Rare',
    language: 'English',
    cardNumber: 'SV107/SV122',
    finish: 'Full Art',
  },
};

function applyProductDefaults(product: Product): Product {
  const normalizedName = product.name.toLowerCase();
  const matchedKey = Object.keys(productSpecsByName).find((key) => normalizedName.includes(key));
  const fallback = matchedKey ? productSpecsByName[matchedKey] : {};

  return {
    ...product,
    setName: product.setName ?? fallback.setName ?? product.category,
    rarity: product.rarity ?? fallback.rarity ?? 'Standard',
    language: product.language ?? fallback.language ?? 'English',
    cardNumber: product.cardNumber ?? fallback.cardNumber ?? '-',
    finish: product.finish ?? fallback.finish ?? 'Regular',
  };
}

interface AppState {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  customers: Customer[];
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  updateTransactionStatus: (id: string, status: 'Lunas' | 'Belum Dibayar' | 'Dibatalkan') => void;
  deleteTransaction: (id: string) => void;

  sellerInfo: SellerInfo;
  updateSellerInfo: (info: Partial<SellerInfo>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      products: defaultProducts,
      addProduct: (product) => set((state) => ({ products: [...state.products, applyProductDefaults(product)] })),
      updateProduct: (id, updatedFields) => set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updatedFields } : p)
      })),
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(p => p.id !== id)
      })),

      customers: defaultCustomers,
      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (id, updatedFields) => set((state) => ({
        customers: state.customers.map(c => c.id === id ? { ...c, ...updatedFields } : c)
      })),
      deleteCustomer: (id) => set((state) => {
        const customer = state.customers.find((item) => item.id === id);
        return {
          customers: state.customers.filter((item) => item.id !== id),
          transactions: customer
            ? state.transactions.map((transaction) => (
                transaction.customerId === id
                  ? {
                      ...transaction,
                      customerName: transaction.customerName || customer.name,
                      customerPhone: transaction.customerPhone ?? customer.phone,
                      customerAddress: transaction.customerAddress ?? customer.address,
                      customerPostalCode: transaction.customerPostalCode ?? customer.postalCode,
                    }
                  : transaction
              ))
            : state.transactions,
        };
      }),

      transactions: defaultTransactions,
      addTransaction: (transaction) => set((state) => ({
        transactions: [{
          ...createTransactionSnapshot(transaction, state.products, state.customers),
          inventoryAdjusted: true,
        }, ...state.transactions],
        products: state.products.map((product) => {
          const soldItem = transaction.items.find((item) => item.productId === product.id);
          if (!soldItem) return product;
          return { ...product, stock: Math.max(0, product.stock - soldItem.quantity) };
        }),
      })),
      updateTransactionStatus: (id, status) => set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, status } : t)
      })),
      deleteTransaction: (id) => set((state) => {
        const deletedTransaction = state.transactions.find((transaction) => transaction.id === id);
        return {
          transactions: state.transactions.filter((transaction) => transaction.id !== id),
          products: deletedTransaction?.inventoryAdjusted
            ? state.products.map((product) => {
                const restoredItem = deletedTransaction.items.find((item) => item.productId === product.id);
                return restoredItem ? { ...product, stock: product.stock + restoredItem.quantity } : product;
              })
            : state.products,
        };
      }),

      sellerInfo: {
        name: 'Iqbal',
        phone: '089646900066',
        location: 'Semarang',
        bankName: 'Bank Mandiri',
        bankAccountNumber: '1350019494119',
        bankAccountHolder: 'IQBAL KURNIA RAMADHAN',
        bcaAccountNumber: '',
        bcaAccountHolder: 'IQBAL KURNIA RAMADHAN',
      },
      updateSellerInfo: (info) => set((state) => ({
        sellerInfo: { ...state.sellerInfo, ...info },
      })),
    }),
    {
      name: 'hypercard-storage',
      version: 9,
      migrate: (persistedState) => {
        const state = persistedState as AppState & { admins?: unknown };
        delete state.admins;
        const mergeDefaults = <T extends { id: string }>(current: T[] | undefined, defaults: T[]) => {
          const existing = current ?? [];
          const existingIds = new Set(existing.map((item) => item.id));
          return [...existing, ...defaults.filter((item) => !existingIds.has(item.id))];
        };
        const migratedProducts = mergeDefaults(state.products, defaultProducts).map(applyProductDefaults);

        return {
          ...state,
          products: migratedProducts,
          customers: mergeDefaults(state.customers, defaultCustomers),
          sellerInfo: {
            name: state.sellerInfo?.name ?? 'Iqbal',
            phone: state.sellerInfo?.phone ?? '089646900066',
            location: state.sellerInfo?.location ?? 'Semarang',
            bankName: state.sellerInfo?.bankName ?? 'Bank Mandiri',
            bankAccountNumber: state.sellerInfo?.bankAccountNumber ?? '1350019494119',
            bankAccountHolder: state.sellerInfo?.bankAccountHolder ?? 'IQBAL KURNIA RAMADHAN',
            bcaAccountNumber: state.sellerInfo?.bcaAccountNumber ?? '',
            bcaAccountHolder: state.sellerInfo?.bcaAccountHolder ?? state.sellerInfo?.bankAccountHolder ?? 'IQBAL KURNIA RAMADHAN',
          },
          transactions: mergeDefaults(state.transactions, defaultTransactions).map((t) => createTransactionSnapshot(
            {
              ...t,
              shippingCost: (t as Transaction).shippingCost ?? 0,
            },
            migratedProducts,
            mergeDefaults(state.customers, defaultCustomers),
          )),
        };
      },
    }
  )
);
