// lib/api/branches.ts
import { apiClient } from "./client";

export interface Branch {
  id: number;
  name: string;
  contactNumber?: string;
  address?: string;
  isActive: boolean;
}

export const branchesApi = {
  getAll: () => apiClient.get<Branch[]>("/branches"),
  getMyBranches: () => apiClient.get<Branch[]>("/branches/my-branches"),
};
