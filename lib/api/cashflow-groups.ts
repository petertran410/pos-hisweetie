import { apiClient } from "@/lib/config/api";

export const cashflowGroupsApi = {
  getCashFlowGroups: (isReceipt?: boolean) => {
    const params = isReceipt !== undefined ? { isReceipt } : {};
    return apiClient.get("/cashflow-groups", params);
  },

  createCashFlowGroup: (data: any) => {
    return apiClient.post("/cashflow-groups", data);
  },
};
