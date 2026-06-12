import { apiClient, type PaginatedResponse } from './apiClient';
import type { CreateTransactionInput, Transaction } from './types';

export const transactionsService = {
  list(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient<PaginatedResponse<Transaction>>('/transactions', { query: params });
  },
  detail(id: string) {
    return apiClient<Transaction>(`/transactions/${id}`);
  },
  nextInvoice() {
    return apiClient<{ invoiceNumber: string }>('/transactions/next-invoice');
  },
  create(input: CreateTransactionInput) {
    return apiClient<Transaction>('/transactions', { method: 'POST', body: input });
  },
  updateStatus(id: string, input: {
    status: Transaction['status'];
    paymentMethod?: Transaction['paymentMethod'];
    mandiriAccountNumber?: string;
    mandiriAccountHolder?: string;
    bcaAccountNumber?: string;
    bcaAccountHolder?: string;
  }) {
    return apiClient<Transaction>(`/transactions/${id}/status`, { method: 'PATCH', body: input });
  },
  delete(id: string) {
    return apiClient<{ success: true }>(`/transactions/${id}`, { method: 'DELETE' });
  },
};
