import { apiClient } from "@/lib/config/api";

export interface CustomerGroup {
  id: number;
  name: string;
  description?: string;
  _count?: {
    customerGroupDetails: number;
  };
}

export const customerGroupsApi = {
  getCustomerGroups: (): Promise<CustomerGroup[]> => {
    return apiClient.get("/customer-groups");
  },
};
