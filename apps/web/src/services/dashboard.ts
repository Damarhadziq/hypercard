import { apiClient, type PaginatedResponse } from './apiClient';
import type { DashboardChartPoint, DashboardReportRow, DashboardReportSummary, DashboardStats, Transaction } from './types';

export const dashboardService = {
  stats() {
    return apiClient<DashboardStats>('/dashboard/stats');
  },
  chart(days = 30) {
    return apiClient<DashboardChartPoint[]>('/dashboard/chart', { query: { days } });
  },
  recent(limit = 5) {
    return apiClient<Transaction[]>('/dashboard/recent', { query: { limit } });
  },
  reportItems(params: {
    mode?: 'all' | 'month' | 'year';
    month?: number;
    year?: number;
    search?: string;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    return apiClient<PaginatedResponse<DashboardReportRow>>('/dashboard/report-items', { query: params });
  },
  reportSummary(params: {
    mode?: 'all' | 'month' | 'year';
    month?: number;
    year?: number;
  }) {
    return apiClient<DashboardReportSummary>('/dashboard/report-summary', { query: params });
  },
};
