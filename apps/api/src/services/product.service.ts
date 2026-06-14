import { eq, ilike, or, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, transactionItems } from '../db/schema.js';
import { storageService } from './storage.service.js';

export interface CreateProductInput {
  name: string;
  category?: string;
  condition?: string;
  setName?: string;
  rarity?: string;
  language?: string;
  cardNumber?: string;
  finish?: string;
  buyPrice: number;
  sellPrice: number;
  stock?: number;
  image?: string;
  notes?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const productService = {
  async getAll(search?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(
          ilike(products.name, `%${search}%`),
          ilike(products.category, `%${search}%`),
          ilike(products.setName, `%${search}%`),
          ilike(products.rarity, `%${search}%`),
          ilike(products.cardNumber, `%${search}%`)
        )
      : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(products)
        .where(conditions)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(conditions),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: countResult[0]?.count ?? 0,
      },
    };
  },

  async getById(id: string) {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    return result[0] ?? null;
  },

  async create(input: CreateProductInput) {
    const result = await db
      .insert(products)
      .values({
        name: input.name,
        category: input.category ?? 'Single Card',
        condition: input.condition ?? 'Near Mint',
        setName: input.setName,
        rarity: input.rarity,
        language: input.language ?? 'English',
        cardNumber: input.cardNumber,
        finish: input.finish ?? 'Regular',
        buyPrice: input.buyPrice,
        sellPrice: input.sellPrice,
        stock: input.stock ?? 0,
        image: input.image,
        notes: input.notes,
      })
      .returning();

    return result[0]!;
  },

  async update(id: string, input: UpdateProductInput) {
    const existing = 'image' in input ? await this.getById(id) : null;
    const result = await db
      .update(products)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    const updated = result[0] ?? null;
    if (updated && existing?.image && input.image !== existing.image) {
      await storageService.removeManagedImageSafely(existing.image);
    }

    return updated;
  },

  async delete(id: string) {
    const existing = await this.getById(id);
    if (!existing) return false;

    const [usage] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactionItems)
      .where(eq(transactionItems.productId, id));

    if ((usage?.count ?? 0) > 0) {
      const archived = await db
        .update(products)
        .set({ stock: 0, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning({ id: products.id });

      return archived.length > 0;
    }

    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    const deleted = result.length > 0;
    if (deleted) {
      await storageService.removeManagedImageSafely(existing.image);
    }

    return deleted;
  },

  async updateImage(id: string, imagePath: string) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await db
      .update(products)
      .set({ image: imagePath, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    const updated = result[0] ?? null;
    if (updated && existing.image !== imagePath) {
      await storageService.removeManagedImageSafely(existing.image);
    }

    return updated;
  },
};
