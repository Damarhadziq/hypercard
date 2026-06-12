import { and, eq, ilike, lte, or, sql, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  transactions,
  transactionItems,
  customers,
  products,
} from '../db/schema.js';

export interface CreateTransactionItemInput {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateTransactionInput {
  invoiceNumber: string;
  customerId: string;
  items: CreateTransactionItemInput[];
  subtotal: number;
  discount: number;
  shippingCost?: number;
  total: number;
  paymentMethod?: 'Mandiri' | 'BCA';
  mandiriAccountNumber?: string;
  mandiriAccountHolder?: string;
  bcaAccountNumber?: string;
  bcaAccountHolder?: string;
  notes?: string;
  date?: string;
}

export const transactionService = {
  async getAll(search?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Build conditions for search across invoice number and customer name.
    const searchConditions = search
      ? or(
          ilike(transactions.invoiceNumber, `%${search}%`),
          ilike(customers.name, `%${search}%`)
        )
      : undefined;
    const conditions = searchConditions
      ? and(lte(transactions.date, todayEnd), searchConditions)
      : lte(transactions.date, todayEnd);

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: transactions.id,
          invoiceNumber: transactions.invoiceNumber,
          customerId: transactions.customerId,
          customerName: customers.name,
          customerPhone: customers.phone,
          customerAddress: customers.address,
          customerPostalCode: customers.postalCode,
          subtotal: transactions.subtotal,
          discount: transactions.discount,
          shippingCost: transactions.shippingCost,
          total: transactions.total,
          status: transactions.status,
          paymentMethod: transactions.paymentMethod,
          mandiriAccountNumber: transactions.mandiriAccountNumber,
          mandiriAccountHolder: transactions.mandiriAccountHolder,
          bcaAccountNumber: transactions.bcaAccountNumber,
          bcaAccountHolder: transactions.bcaAccountHolder,
          notes: transactions.notes,
          date: transactions.date,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(customers, eq(transactions.customerId, customers.id))
        .where(conditions)
        .orderBy(desc(transactions.date))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .leftJoin(customers, eq(transactions.customerId, customers.id))
        .where(conditions),
    ]);

    const transactionIds = data.map((transaction) => transaction.id);
    const items = transactionIds.length > 0
      ? await db
          .select({
            transactionId: transactionItems.transactionId,
            id: transactionItems.id,
            productId: transactionItems.productId,
            productName: products.name,
            productCategory: products.category,
            productCondition: products.condition,
            productSetName: products.setName,
            productRarity: products.rarity,
            productLanguage: products.language,
            productCardNumber: products.cardNumber,
            productImage: products.image,
            buyPrice: products.buyPrice,
            quantity: transactionItems.quantity,
            price: transactionItems.price,
          })
          .from(transactionItems)
          .leftJoin(products, eq(transactionItems.productId, products.id))
          .where(inArray(transactionItems.transactionId, transactionIds))
      : [];

    const itemsByTransactionId = new Map<string, Omit<(typeof items)[number], 'transactionId'>[]>();
    for (const item of items) {
      const { transactionId, ...rest } = item;
      const existing = itemsByTransactionId.get(transactionId) ?? [];
      existing.push(rest);
      itemsByTransactionId.set(transactionId, existing);
    }

    return {
      data: data.map((transaction) => ({
        ...transaction,
        items: itemsByTransactionId.get(transaction.id) ?? [],
      })),
      pagination: {
        page,
        limit,
        total: countResult[0]?.count ?? 0,
      },
    };
  },

  async getById(id: string) {
    // Get the transaction with customer info
    const txnResult = await db
      .select({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        customerId: transactions.customerId,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerAddress: customers.address,
        customerPostalCode: customers.postalCode,
        subtotal: transactions.subtotal,
        discount: transactions.discount,
        shippingCost: transactions.shippingCost,
        total: transactions.total,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        mandiriAccountNumber: transactions.mandiriAccountNumber,
        mandiriAccountHolder: transactions.mandiriAccountHolder,
        bcaAccountNumber: transactions.bcaAccountNumber,
        bcaAccountHolder: transactions.bcaAccountHolder,
        notes: transactions.notes,
        date: transactions.date,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(customers, eq(transactions.customerId, customers.id))
      .where(eq(transactions.id, id))
      .limit(1);

    if (txnResult.length === 0) return null;

    // Get items with product info
    const items = await db
      .select({
        id: transactionItems.id,
        productId: transactionItems.productId,
        productName: products.name,
        productCategory: products.category,
        productCondition: products.condition,
        productSetName: products.setName,
        productRarity: products.rarity,
        productLanguage: products.language,
        productCardNumber: products.cardNumber,
        productImage: products.image,
        buyPrice: products.buyPrice,
        quantity: transactionItems.quantity,
        price: transactionItems.price,
      })
      .from(transactionItems)
      .leftJoin(products, eq(transactionItems.productId, products.id))
      .where(eq(transactionItems.transactionId, id));

    return {
      ...txnResult[0]!,
      items,
    };
  },

  /**
   * Creates a transaction with items in a single Postgres transaction.
   * Also decrements product stock for each item.
   */
  async create(input: CreateTransactionInput) {
    const createdTransaction = await db.transaction(async (tx) => {
      // 1. Insert the transaction
      const [txn] = await tx
        .insert(transactions)
        .values({
          invoiceNumber: input.invoiceNumber,
          customerId: input.customerId,
          subtotal: input.subtotal,
          discount: input.discount,
          shippingCost: input.shippingCost ?? 0,
          total: input.total,
          status: 'Belum Dibayar',
          paymentMethod: input.paymentMethod ?? 'Mandiri',
          mandiriAccountNumber: input.mandiriAccountNumber,
          mandiriAccountHolder: input.mandiriAccountHolder,
          bcaAccountNumber: input.bcaAccountNumber,
          bcaAccountHolder: input.bcaAccountHolder,
          notes: input.notes,
          date: input.date ? new Date(input.date) : new Date(),
        })
        .returning();

      // 2. Insert all line items and decrement stock
      for (const item of input.items) {
        await tx.insert(transactionItems).values({
          transactionId: txn!.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        });

        // Decrement stock
        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId));
      }

      return txn!;
    });

    return await this.getById(createdTransaction.id) ?? createdTransaction;
  },

  async updateStatus(
    id: string,
    input: {
      status: 'Lunas' | 'Belum Dibayar';
      paymentMethod?: 'Mandiri' | 'BCA';
      mandiriAccountNumber?: string;
      mandiriAccountHolder?: string;
      bcaAccountNumber?: string;
      bcaAccountHolder?: string;
    },
  ) {
    const paymentFields = input.status === 'Lunas' && input.paymentMethod
      ? {
          paymentMethod: input.paymentMethod,
          mandiriAccountNumber: input.mandiriAccountNumber,
          mandiriAccountHolder: input.mandiriAccountHolder,
          bcaAccountNumber: input.bcaAccountNumber,
          bcaAccountHolder: input.bcaAccountHolder,
        }
      : {};

    const result = await db
      .update(transactions)
      .set({ status: input.status, ...paymentFields, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();

    if (!result[0]) return null;

    return await this.getById(result[0].id) ?? result[0];
  },

  async delete(id: string) {
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning({ id: transactions.id });

    return result.length > 0;
  },

  /**
   * Generate the next invoice number based on current year and count.
   */
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(ilike(transactions.invoiceNumber, `${prefix}%`));

    const nextNum = (result[0]?.count ?? 0) + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  },
};
