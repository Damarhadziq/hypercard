import { eq, and, ne, desc, ilike, or, sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { db } from '../db/index.js';
import { account, user } from '../db/schema.js';
import { auth } from '../lib/auth.js';

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
}

export const adminService = {
  async getAll(search?: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const conditions = search
      ? or(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`),
          ilike(user.role, `%${search}%`)
        )
      : undefined;

    const [data, countResult] = await Promise.all([
      db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(conditions)
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(user)
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

  async create(input: CreateAdminInput) {
    // Use the admin endpoint so the credential account and role are created together.
    const result = await (auth.api.createUser as unknown as (input: {
      body: {
        name: string;
        email: string;
        password: string;
        role: string;
        data: { status: string };
      };
    }) => Promise<{ user: unknown }>)({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: 'admin',
        data: { status: 'active' },
      },
    });

    return result.user;
  },

  async updatePassword(id: string, password: string) {
    const hashedPassword = await hashPassword(password);
    const [updatedAccount] = await db
      .update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(account.userId, id),
          eq(account.providerId, 'credential')
        )
      )
      .returning({ id: account.id });

    return Boolean(updatedAccount);
  },

  async toggleStatus(id: string) {
    // Prevent toggling superadmin
    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!targetUser) return null;
    if (targetUser.role === 'superadmin') return targetUser;

    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';

    const [updated] = await db
      .update(user)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();

    return updated ?? null;
  },

  async delete(id: string) {
    // Prevent deleting superadmins
    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!targetUser || targetUser.role === 'superadmin') {
      return false;
    }

    await db.delete(user).where(
      and(eq(user.id, id), ne(user.role, 'superadmin'))
    );

    return true;
  },

  async touchLogin(id: string) {
    await db
      .update(user)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(user.id, id));
  },
};
