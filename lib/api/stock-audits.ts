import { apiClient } from "@/lib/config/api";
import {
  StockAuditQueryParams,
  StockAuditsResponse,
  StockAudit,
  CreateStockAuditDto,
  UpdateStockAuditDto,
} from "../types/stock-audit";

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
