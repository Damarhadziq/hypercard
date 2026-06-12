import { eq, ilike, or, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { customers } from '../db/schema.js';

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  notes?: string;
  history?: string;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export const customerService = {
  async getAll(search?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const conditions = search
      ? or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.phone, `%${search}%`)
        )
      : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(customers)
        .where(conditions)
        .orderBy(desc(customers.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(customers)
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
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    return result[0] ?? null;
  },

  async create(input: CreateCustomerInput) {
    const result = await db
      .insert(customers)
      .values({
        name: input.name,
        phone: input.phone,
        address: input.address,
        postalCode: input.postalCode,
        notes: input.notes,
        history: input.history,
      })
      .returning();

    return result[0]!;
  },

  async update(id: string, input: UpdateCustomerInput) {
    const result = await db
      .update(customers)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    return result[0] ?? null;
  },

  async delete(id: string) {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning({ id: customers.id });

    return result.length > 0;
  },
};
