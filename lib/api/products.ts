// lib/api/products.ts
import { apiClient } from "./client";

export interface Product {
  id: number;
  code: string;
  name: string;
  fullName?: string;
  description?: string;
  image?: string;
  categoryId?: number;
  category?: { id: number; name: string };
  tradeMarkId?: number;
  tradeMark?: { id: number; name: string };
  variantId?: number;
  variant?: { id: number; name: string };
  purchasePrice: number;
  retailPrice: number;
  collaboratorPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  weight?: number;
  weightUnit?: string;
  unit?: string;
  attributesText?: string;
  attributes?: Array<{
    id: number;
    attributeName: string;
    attributeValue: string;
  }>;
  images?: Array<{
    id: number;
    image: string;
  }>;
  isActive: boolean;
  isDirectSale: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  isActive?: boolean;
}

export interface CreateProductDto {
  code: string;
  name: string;
  fullName?: string;
  description?: string;
  image?: string;
  categoryId?: number;
  tradeMarkId?: number;
  variantId?: number;
  purchasePrice?: number;
  retailPrice?: number;
  collaboratorPrice?: number;
  stockQuantity?: number;
  minStockAlert?: number;
  weight?: number;
  weightUnit?: string;
  unit?: string;
  attributesText?: string;
  isActive?: boolean;
  isDirectSale?: boolean;
  imageUrls?: string[];
}

export const productsApi = {
  getAll: (params: ProductQueryDto) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    return apiClient.get<{
      data: Product[];
      total: number;
      page: number;
      limit: number;
    }>(`/products?${query}`);
  },

  getOne: (id: number) => apiClient.get<Product>(`/products/${id}`),

  create: (data: CreateProductDto) =>
    apiClient.post<Product>("/products", data),

  update: (id: number, data: Partial<CreateProductDto>) =>
    apiClient.put<Product>(`/products/${id}`, data),

  delete: (id: number) => apiClient.delete(`/products/${id}`),
};
