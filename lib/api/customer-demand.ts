import { apiClient } from '@/lib/config/api';
import type {
  CreateCustomerDemandRequest,
  CustomerDemand,
  CustomerDemandFilters,
  CustomerDemandImportPreview,
  CustomerDemandImportResult,
  CustomerDemandListResponse,
  UpdateCustomerDemandRequest,
} from '@/lib/types/customer-demand';

const BASE = '/customer-demand';

export const customerDemandApi = {
  list: (filters: CustomerDemandFilters = {}): Promise<CustomerDemandListResponse> =>
    apiClient.get(BASE, filters),
  searchCustomers: (search?: string): Promise<Array<{ id: number; code?: string | null; name: string }>> =>
    apiClient.get(`${BASE}/customers/search`, search?.trim() ? { search: search.trim() } : {}),
  get: (id: number): Promise<CustomerDemand> => apiClient.get(`${BASE}/${id}`),
  create: (data: CreateCustomerDemandRequest): Promise<CustomerDemand> =>
    apiClient.post(BASE, data),
  update: (id: number, data: UpdateCustomerDemandRequest): Promise<CustomerDemand> =>
    apiClient.patch(`${BASE}/${id}`, data),
  approveMonth: (id: number): Promise<{ id: number; status: string }> =>
    apiClient.post(`${BASE}/months/${id}/approve`, {}),
  cancelMonth: (id: number, reason?: string): Promise<{ id: number; status: string }> =>
    apiClient.post(`${BASE}/months/${id}/cancel`, reason ? { reason } : {}),
  importPreview: (file: File): Promise<CustomerDemandImportPreview> => {
    const data = new FormData();
    data.append('file', file);
    return apiClient.postForm(`${BASE}/import/preview`, data);
  },
  importCommit: (file: File): Promise<CustomerDemandImportResult> => {
    const data = new FormData();
    data.append('file', file);
    return apiClient.postForm(`${BASE}/import`, data);
  },
  importTemplateUrl: `${BASE}/import/template`,
};
