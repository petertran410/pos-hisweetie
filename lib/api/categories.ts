import { apiClient } from "@/lib/config/api";

export interface Category {
  id: number;
  name: string;
  parentId?: number;
  hasChild: boolean;
  children?: Category[];
  _count?: {
    products: number;
  };
}

export const categoriesApi = {
  getCategories: (): Promise<Category[]> => {
    return apiClient.get("/categories");
  },

  getRootCategories: (): Promise<Category[]> => {
    return apiClient.get("/categories/roots");
  },

  createCategory: (data: {
    name: string;
    parentId?: number;
  }): Promise<Category> => {
    return apiClient.post("/categories", data);
  },

  updateCategory: (
    id: number,
    data: { name?: string; parentId?: number }
  ): Promise<Category> => {
    return apiClient.put(`/categories/${id}`, data);
  },

  deleteCategory: (id: number): Promise<void> => {
    return apiClient.delete(`/categories/${id}`);
  },
};
