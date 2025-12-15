import { apiClient } from "@/lib/config/api";

export interface Category {
  id: number;
  name: string;
  parentId?: number;
  hasChild: boolean;
  children?: Category[];
}

export const categoriesApi = {
  getCategories: (): Promise<Category[]> => {
    return apiClient.get("/categories");
  },

  getRootCategories: (): Promise<Category[]> => {
    return apiClient.get("/categories/roots");
  },
};
