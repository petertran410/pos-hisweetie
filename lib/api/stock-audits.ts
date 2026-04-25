import { apiClient } from "@/lib/config/api";

export interface StockAuditDetail {
  id: number;
  stockAuditId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  costAtCheck: number;
  differenceValue: number;
  note?: string;
  product?: { id: number; code: string; name: string; unit?: string };
}

export interface StockAudit {
  id: number;
  code: string;
  branchId: number;
  branchName: string;
  checkDate: string;
  note?: string;
  status: number; // 1=DRAFT, 2=COMPLETED, 3=CANCELLED
  createdById: number;
  createdByName: string;
  completedById?: number;
  completedByName?: string;
  completedAt?: string;
  createdAt: string;
  branch?: { id: number; name: string };
  creator?: { id: number; name: string };
  completedBy?: { id: number; name: string };
  details: StockAuditDetail[];
}

export interface StockAuditsResponse {
  data: StockAudit[];
  total: number;
  page: number;
  limit: number;
}

export interface StockAuditQueryParams {
  search?: string;
  branchId?: number;
  status?: number;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  creatorId?: number;
}

export interface CreateStockAuditItem {
  productId: number;
  actualQuantity: number;
  note?: string;
}

export interface CreateStockAuditDto {
  branchId: number;
  note?: string;
  items: CreateStockAuditItem[];
}

export interface UpdateStockAuditDto {
  note?: string;
  items?: CreateStockAuditItem[];
}

export const stockAuditsApi = {
  getAll: (params?: StockAuditQueryParams): Promise<StockAuditsResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.branchId) query.append("branchId", params.branchId.toString());
    if (params?.status) query.append("status", params.status.toString());
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.fromDate) query.append("fromDate", params.fromDate);
    if (params?.toDate) query.append("toDate", params.toDate);
    if (params?.creatorId)
      query.append("creatorId", params.creatorId.toString());
    return apiClient.get(`/stock-audits?${query.toString()}`);
  },

  getOne: (id: number): Promise<StockAudit> =>
    apiClient.get(`/stock-audits/${id}`),

  create: (data: CreateStockAuditDto): Promise<StockAudit> =>
    apiClient.post("/stock-audits", data),

  update: (id: number, data: UpdateStockAuditDto): Promise<StockAudit> =>
    apiClient.put(`/stock-audits/${id}`, data),

  complete: (id: number): Promise<StockAudit> =>
    apiClient.put(`/stock-audits/${id}/complete`),

  cancel: (id: number): Promise<StockAudit> =>
    apiClient.put(`/stock-audits/${id}/cancel`),
};
