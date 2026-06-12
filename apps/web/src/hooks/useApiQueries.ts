import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminsService } from '../services/admins';
import { authService } from '../services/auth';
import { customersService } from '../services/customers';
import { dashboardService } from '../services/dashboard';
import { productsService } from '../services/products';
import { transactionsService } from '../services/transactions';
import type { AdminInput, CustomerInput, CustomerUpdateInput, ProductInput, ProductUpdateInput, UpdateTransactionStatusInput } from '../services/types';

export const queryKeys = {
  authSession: ['auth', 'session'] as const,
  admins: (params?: unknown) => ['admins', params ?? {}] as const,
  products: (params?: unknown) => ['products', params ?? {}] as const,
  product: (id?: string) => ['products', id] as const,
  customers: (params?: unknown) => ['customers', params ?? {}] as const,
  customer: (id?: string) => ['customers', id] as const,
  transactions: (params?: unknown) => ['transactions', params ?? {}] as const,
  transaction: (id?: string) => ['transactions', id] as const,
  nextInvoice: ['transactions', 'next-invoice'] as const,
  dashboardStats: ['dashboard', 'stats'] as const,
  dashboardChart: (days: number) => ['dashboard', 'chart', days] as const,
  dashboardRecent: (limit: number) => ['dashboard', 'recent', limit] as const,
  dashboardReportItems: (params?: unknown) => ['dashboard', 'report-items', params ?? {}] as const,
};

function useInvalidateAppData() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };
}

export function useAuthSession() {
  return useQuery({
    queryKey: queryKeys.authSession,
    queryFn: authService.getSession,
    retry: false,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authService.signIn(email, password),
    onSuccess: (session) => queryClient.setQueryData(queryKeys.authSession, session),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.authSession, null);
      void queryClient.invalidateQueries();
    },
  });
}

export function useProducts(params: { search?: string; page?: number; limit?: number } = { limit: 1000 }) {
  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: () => productsService.list(params),
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => productsService.detail(id!),
    enabled: Boolean(id),
  });
}

export function useProductMutations() {
  const invalidate = useInvalidateAppData();
  const queryClient = useQueryClient();
  return {
    createProduct: useMutation({ mutationFn: (input: ProductInput) => productsService.create(input), onSuccess: invalidate }),
    updateProduct: useMutation({ mutationFn: ({ id, input }: { id: string; input: ProductUpdateInput }) => productsService.update(id, input), onSuccess: invalidate }),
    deleteProduct: useMutation({ mutationFn: (id: string) => productsService.delete(id), onSuccess: invalidate }),
    uploadProductImage: useMutation({
      mutationFn: ({ id, image }: { id: string; image: File }) => productsService.uploadImage(id, image),
      onSuccess: async (product) => {
        queryClient.setQueryData(queryKeys.product(product.id), product);
        await invalidate();
      },
    }),
  };
}

export function useCustomers(params: { search?: string; page?: number; limit?: number } = { limit: 1000 }) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: () => customersService.list(params),
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => customersService.detail(id!),
    enabled: Boolean(id),
  });
}

export function useCustomerMutations() {
  const invalidate = useInvalidateAppData();
  return {
    createCustomer: useMutation({ mutationFn: (input: CustomerInput) => customersService.create(input), onSuccess: invalidate }),
    updateCustomer: useMutation({ mutationFn: ({ id, input }: { id: string; input: CustomerUpdateInput }) => customersService.update(id, input), onSuccess: invalidate }),
    deleteCustomer: useMutation({ mutationFn: (id: string) => customersService.delete(id), onSuccess: invalidate }),
  };
}

export function useTransactions(params: { search?: string; page?: number; limit?: number } = { limit: 1000 }) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: () => transactionsService.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(id?: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: () => transactionsService.detail(id!),
    enabled: Boolean(id),
  });
}

export function useNextInvoice() {
  return useQuery({
    queryKey: queryKeys.nextInvoice,
    queryFn: transactionsService.nextInvoice,
  });
}

export function useTransactionMutations() {
  const invalidate = useInvalidateAppData();
  return {
    createTransaction: useMutation({ mutationFn: transactionsService.create, onSuccess: invalidate }),
    updateTransactionStatus: useMutation({ mutationFn: ({ id, input }: { id: string; input: UpdateTransactionStatusInput }) => transactionsService.updateStatus(id, input), onSuccess: invalidate }),
    deleteTransaction: useMutation({ mutationFn: (id: string) => transactionsService.delete(id), onSuccess: invalidate }),
  };
}

export function useAdmins(params: { search?: string; page?: number; limit?: number } = { limit: 1000 }) {
  return useQuery({
    queryKey: queryKeys.admins(params),
    queryFn: () => adminsService.list(params),
  });
}

export function useAdminMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admins'] });

  return {
    createAdmin: useMutation({ mutationFn: (input: AdminInput) => adminsService.create(input), onSuccess: invalidate }),
    updateAdminPassword: useMutation({ mutationFn: ({ id, password }: { id: string; password: string }) => adminsService.updatePassword(id, password) }),
    toggleAdminStatus: useMutation({ mutationFn: (id: string) => adminsService.toggleStatus(id), onSuccess: invalidate }),
    deleteAdmin: useMutation({ mutationFn: (id: string) => adminsService.delete(id), onSuccess: invalidate }),
  };
}

export function useDashboardStats() {
  return useQuery({ queryKey: queryKeys.dashboardStats, queryFn: dashboardService.stats });
}

export function useDashboardChart(days = 30) {
  return useQuery({ queryKey: queryKeys.dashboardChart(days), queryFn: () => dashboardService.chart(days) });
}

export function useDashboardRecent(limit = 5) {
  return useQuery({ queryKey: queryKeys.dashboardRecent(limit), queryFn: () => dashboardService.recent(limit) });
}

export function useDashboardReportItems(params: {
  mode?: 'all' | 'month' | 'year';
  month?: number;
  year?: number;
  search?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.dashboardReportItems(params),
    queryFn: () => dashboardService.reportItems(params),
  });
}

export function useDashboardData({ chartDays = 30, recentLimit = 5 } = {}) {
  return {
    stats: useDashboardStats(),
    chart: useDashboardChart(chartDays),
    recent: useDashboardRecent(recentLimit),
  };
}
