import { apiClient, type PaginatedResponse } from './apiClient';
import type { Customer, CustomerInput, CustomerUpdateInput } from './types';

export const customersService = {
  list(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient<PaginatedResponse<Customer>>('/customers', { query: params });
  },
  detail(id: string) {
    return apiClient<Customer>(`/customers/${id}`);
  },
  create(input: CustomerInput) {
    return apiClient<Customer>('/customers', { method: 'POST', body: input });
  },
  update(id: string, input: CustomerUpdateInput) {
    return apiClient<Customer>(`/customers/${id}`, { method: 'PATCH', body: input });
  },
  delete(id: string) {
    return apiClient<{ success: true }>(`/customers/${id}`, { method: 'DELETE' });
  },
};
