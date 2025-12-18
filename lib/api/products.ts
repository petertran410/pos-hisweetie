import { apiClient } from "@/lib/config/api";

export interface ProductComponent {
  id: number;
  comboProductId: number;
  componentProductId: number;
  quantity: number;
  componentProduct: Product;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  fullName?: string;
  description?: string;
  orderTemplate?: string;
  type: number;
  categoryId?: number;
  tradeMarkId?: number;
  variantId?: number;
  purchasePrice: number;
  retailPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  maxStockAlert: number;
  weight?: number;
  weightUnit?: string;
  unit?: string;
  conversionValue?: number;
  masterProductId?: number;
  attributesText?: string;
  isActive: boolean;
  isDirectSale: boolean;
  isRewardPoint?: boolean;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string };
  tradeMark?: { id: number; name: string };
  variant?: { id: number; name: string };
  images?: { id: number; image: string }[];
  comboComponents?: ProductComponent[];
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export const productsApi = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryIds?: string;
    isActive?: boolean;
    branchId?: number;
  }): Promise<ProductsResponse> => {
    return apiClient.get("/products", params);
  },

  getProduct: (id: number): Promise<Product> => {
    return apiClient.get(`/products/${id}`);
  },

  createProduct: (data: any): Promise<Product> => {
    return apiClient.post("/products", data);
  },

  updateProduct: (id: number, data: any): Promise<Product> => {
    return apiClient.put(`/products/${id}`, data);
  },

  deleteProduct: (id: number): Promise<void> => {
    return apiClient.delete(`/products/${id}`);
  },

  updateRetailPrice: (id: number, retailPrice: number): Promise<Product> => {
    return apiClient.put(`/products/${id}`, { retailPrice });
  },
};
