import { apiClient } from "@/lib/config/api";

export type CategoryType = "parent" | "middle" | "child";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: CategoryType;
}

export const categoriesApi = {
  getAll: (type?: CategoryType) => {
    const params = type ? { type } : {};
    return apiClient.get<Category[]>("/categories", { params });
  },

  create: (data: CreateCategoryDto) =>
    apiClient.post<Category>("/categories", data),

  update: (id: number, data: Partial<CreateCategoryDto>) =>
    apiClient.put<Category>(`/categories/${id}`, data),

  delete: (id: number) => apiClient.delete(`/categories/${id}`),
};
