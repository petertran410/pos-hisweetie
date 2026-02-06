import { apiClient } from "@/lib/config/api";

export interface CustomerGroup {
  id: number;
  name: string;
  description?: string;
  discount?: number;
  _count?: {
    customerGroupDetails: number;
  };
}

export interface CreateCustomerGroupDto {
  name: string;
  discount?: number;
  description?: string;
}

export interface UpdateCustomerGroupDto {
  name?: string;
  discount?: number;
  description?: string;
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

  delete: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete(`/customer-groups/${id}`);
  },
};
