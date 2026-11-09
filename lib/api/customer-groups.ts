import { apiClient } from "@/lib/config/api";

export interface CustomerGroup {
  id: number;
  name: string;
  description?: string;
  discount?: number;
  allowedUserIds?: number[];
  autoAddConditions?: Array<{
    field: string;
    operator: string;
    value: string | number;
  }>;
  autoUpdateMode?: string;
  autoExecute?: boolean;
  // false = nhóm đã hủy
  isActive?: boolean;
  customerCount?: number;
  customerGroupDetails?: { id: number; customerId: number; groupId: number }[];
  _count?: {
    customerGroupDetails: number;
  };
}

export interface CancelledCustomerGroup {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  creator?: { id: number; name: string } | null;
}

export interface CreateCustomerGroupDto {
  name: string;
  discount?: number;
  description?: string;
  allowedUserIds?: number[];
  autoAddConditions?: Array<{
    field: string;
    operator: string;
    value: string | number;
  }>;
  autoUpdateMode?: string;
  autoExecute?: boolean;
}

export interface UpdateCustomerGroupDto {
  name?: string;
  discount?: number;
  description?: string;
  allowedUserIds?: number[];
  autoAddConditions?: Array<{
    field: string;
    operator: string;
    value: string | number;
  }>;
  autoUpdateMode?: string;
  autoExecute?: boolean;
}

export const customerGroupsApi = {
  getAll: async (): Promise<{ data: CustomerGroup[]; total: number }> => {
    return apiClient.get("/customer-groups");
  },

  getById: async (id: number): Promise<CustomerGroup> => {
    return apiClient.get(`/customer-groups/${id}`);
  },

  create: async (data: CreateCustomerGroupDto): Promise<CustomerGroup> => {
    return apiClient.post("/customer-groups", data);
  },

  update: async (
    id: number,
    data: UpdateCustomerGroupDto
  ): Promise<CustomerGroup> => {
    return apiClient.put(`/customer-groups/${id}`, data);
  },

  getCancelled: async (): Promise<{
    data: CancelledCustomerGroup[];
    total: number;
  }> => {
    return apiClient.get("/customer-groups/cancelled");
  },

  // Hủy nhóm (không xóa dữ liệu). removeCustomers = gỡ hết khách rồi hủy.
  cancel: async (
    id: number,
    removeCustomers = false
  ): Promise<{ message: string; removedCustomers: number }> => {
    return apiClient.post(`/customer-groups/${id}/cancel`, { removeCustomers });
  },

  restore: async (id: number): Promise<{ message: string }> => {
    return apiClient.post(`/customer-groups/${id}/restore`, {});
  },
};
