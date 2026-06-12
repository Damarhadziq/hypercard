import { apiClient, type PaginatedResponse } from './apiClient';
import type { Product, ProductInput, ProductUpdateInput } from './types';

export const productsService = {
  list(params: { search?: string; page?: number; limit?: number } = {}) {
    return apiClient<PaginatedResponse<Product>>('/products', { query: params });
  },
  detail(id: string) {
    return apiClient<Product>(`/products/${id}`);
  },
  create(input: ProductInput) {
    return apiClient<Product>('/products', { method: 'POST', body: input });
  },
  update(id: string, input: ProductUpdateInput) {
    return apiClient<Product>(`/products/${id}`, { method: 'PATCH', body: input });
  },
  delete(id: string) {
    return apiClient<{ success: true }>(`/products/${id}`, { method: 'DELETE' });
  },
  uploadImage(id: string, image: File) {
    const formData = new FormData();
    formData.set('image', image);
    return apiClient<Product>(`/products/${id}/image`, { method: 'POST', body: formData });
  },
};
