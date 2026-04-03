import { apiClient } from "@/lib/config/api";

export const cashflowCollectionBranchesApi = {
  getAll: (): Promise<any[]> => {
    return apiClient.get("/cashflow-collection-branches");
  },

  create: (data: { name: string; description?: string }): Promise<any> => {
    return apiClient.post("/cashflow-collection-branches", data);
  },
};
