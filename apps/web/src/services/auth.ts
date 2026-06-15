import { apiClient } from './apiClient';
import { authClient } from './authClient';
import type { AdminUser } from './types';

export type AuthSession = Pick<AdminUser, 'id' | 'name' | 'email' | 'role'>;

function normalizeUser(user: unknown): AuthSession | null {
  if (!user || typeof user !== 'object') return null;
  const candidate = user as Partial<AdminUser>;
  if (!candidate.id || !candidate.email || !candidate.name) return null;

  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role ?? 'admin',
  };
}

export const authService = {
  async getSession(): Promise<AuthSession | null> {
    const result = await authClient.getSession();
    return normalizeUser(result.data?.user);
  },
  async signIn(email: string, password: string): Promise<AuthSession> {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      const message = result.error.message || 'Email atau password tidak sesuai.';
      throw new Error(
        result.error.code === 'ACCOUNT_ALREADY_IN_USE'
          ? 'Akun sedang digunakan di perangkat lain. Logout dari sesi aktif sebelum login kembali.'
          : message
      );
    }

    await apiClient<{ success: true }>('/auth/touch-login', { method: 'POST' });
    const session = normalizeUser(result.data?.user) ?? await this.getSession();
    if (!session) throw new Error('Sesi login tidak ditemukan.');
    return session;
  },
  async signOut() {
    await authClient.signOut();
  },
};
