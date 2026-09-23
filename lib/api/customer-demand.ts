import { apiClient } from '@/lib/config/api';
import type {
  CreateCustomerDemandRequest,
  CustomerDemand,
  CustomerDemandFilters,
  CustomerDemandImportPreview,
  CustomerDemandImportResult,
  CustomerDemandLarkSyncPreview,
  CustomerDemandLarkSyncResult,
  CustomerDemandLarkSyncStatus,
  CustomerDemandLarkVoucherSplitPreview,
  CustomerDemandLarkVoucherSplitResult,
  CustomerDemandListResponse,
  CustomerDemandOrderSummary,
  UpdateCustomerDemandRequest,
  UpdateCustomerDemandMonthRequest,
} from '@/lib/types/customer-demand';

const BASE = '/customer-demand';

export const customerDemandApi = {
  list: (filters: CustomerDemandFilters = {}): Promise<CustomerDemandListResponse> =>
    apiClient.get(BASE, filters),
  searchCustomers: async (
    search?: string
  ): Promise<Array<{ id: number; code?: string | null; name: string }>> => {
    const response = await apiClient.get<
      | Array<{ id: number; code?: string | null; name: string }>
      | { data?: Array<{ id: number; code?: string | null; name: string }> }
    >(
      "/customers/search",
      search?.trim() ? { search: search.trim() } : {}
    );
    if (Array.isArray(response)) return response;
    return Array.isArray(response?.data) ? response.data : [];
  },
  orderSummary: (filters: CustomerDemandFilters = {}): Promise<CustomerDemandOrderSummary> =>
    apiClient.get(`${BASE}/order-summary`, filters),
  get: (id: number): Promise<CustomerDemand> => apiClient.get(`${BASE}/${id}`),
  create: (data: CreateCustomerDemandRequest): Promise<CustomerDemand> =>
    apiClient.post(BASE, data),
  update: (id: number, data: UpdateCustomerDemandRequest): Promise<CustomerDemand> =>
    apiClient.patch(`${BASE}/${id}`, data),
  updateMonth: (
    id: number,
    data: UpdateCustomerDemandMonthRequest
  ): Promise<CustomerDemand> => apiClient.patch(`${BASE}/months/${id}`, data),
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
  previewLarkSync: (): Promise<CustomerDemandLarkSyncPreview> =>
    apiClient.post(`${BASE}/sync/lark/preview`, {}),
  syncLark: (): Promise<CustomerDemandLarkSyncResult> =>
    apiClient.post(`${BASE}/sync/lark`, {}),
  previewLarkVoucherSplit: (): Promise<CustomerDemandLarkVoucherSplitPreview> =>
    apiClient.post(`${BASE}/sync/lark/vouchers/preview`, {}),
  splitLarkVouchers: (): Promise<CustomerDemandLarkVoucherSplitResult> =>
    apiClient.post(`${BASE}/sync/lark/vouchers`, {}),
  larkSyncStatus: (): Promise<CustomerDemandLarkSyncStatus> =>
    apiClient.get(`${BASE}/sync/lark/status`),
  importTemplateUrl: `${BASE}/import/template`,
};
