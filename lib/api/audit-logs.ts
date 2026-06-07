import { apiClient } from "@/lib/config/api";

export const auditLogsApi = {
  getAll: (params?: {
    userId?: number;
    branchId?: number;
    entityType?: string;
    actionCode?: string;
    category?: string;
    severity?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    return apiClient.get("/audit-logs", params);
  },
};
