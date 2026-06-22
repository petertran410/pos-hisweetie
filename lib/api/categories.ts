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
    // apiClient.get(endpoint, params) — arg thứ 2 LÀ query map. Trước đây bọc
    // { params } thừa 1 lớp → URL thành ?params=[object Object]. Truyền thẳng.
    return apiClient.get<Category[]>("/categories", type ? { type } : undefined);
  },

  create: (data: CreateCategoryDto) =>
    apiClient.post<Category>("/categories", data),

  update: (id: number, data: Partial<CreateCategoryDto>) =>
    apiClient.put<Category>(`/categories/${id}`, data),

  delete: (id: number) => apiClient.delete(`/categories/${id}`),
};
