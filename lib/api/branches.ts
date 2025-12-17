import { apiClient } from "@/lib/config/api";

export interface Branch {
  id: number;
  name: string;
  code?: string;
  contactNumber?: string;
  address?: string;
  isActive: boolean;
}

export interface BranchesResponse {
  data?: Branch[];
}

export const branchesApi = {
  getBranches: (): Promise<Branch[]> => {
    return apiClient.get("/branches");
  },

  getMyBranches: (): Promise<Branch[]> => {
    return apiClient.get("/branches/my-branches");
  },
};
