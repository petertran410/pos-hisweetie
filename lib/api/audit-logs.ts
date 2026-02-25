import { apiClient } from "@/lib/config/api";

export const auditLogsApi = {
  getAll: (params?: {
    userId?: number;
    resource?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    return apiClient.get("/audit-logs", params);
  },
};
