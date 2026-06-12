import { apiClient, type PaginatedResponse } from './apiClient';
import type { AdminInput, AdminUser } from './types';

export const adminsService = {
  list(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient<PaginatedResponse<AdminUser>>('/admins', { query: params });
  },
  create(input: AdminInput) {
    return apiClient<AdminUser>('/admins', { method: 'POST', body: input });
  },
  updatePassword(id: string, password: string) {
    return apiClient<{ success: true }>(`/admins/${id}/password`, { method: 'PATCH', body: { password } });
  },
  toggleStatus(id: string) {
    return apiClient<AdminUser>(`/admins/${id}/status`, { method: 'PATCH' });
  },
  delete(id: string) {
    return apiClient<{ success: true }>(`/admins/${id}`, { method: 'DELETE' });
  },
};
