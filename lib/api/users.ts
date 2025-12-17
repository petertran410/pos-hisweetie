import { apiClient } from "@/lib/config/api";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  branchId?: number;
  isActive: boolean;
}

export interface UsersResponse {
  data?: User[];
}

export const usersApi = {
  getUsers: (): Promise<User[]> => {
    return apiClient.get("/users");
  },

  getUser: (id: number): Promise<User> => {
    return apiClient.get(`/users/${id}`);
  },
};
