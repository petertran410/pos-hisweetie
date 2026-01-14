import { apiClient } from "@/lib/config/api";

export interface ProductComponent {
  id: number;
  comboProductId: number;
  componentProductId: number;
  quantity: number;
  componentProduct: Product;
}

export interface Inventory {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  branchId: number;
  branchName: string;
  cost: number;
  onHand: number;
  reserved: number;
  onOrder: number;
  minQuality: number;
  maxQuality: number;
  createdAt: string;
  updatedAt: string;
  branch?: { id: number; name: string };
}

export interface Product {
  id: number;
  code: string;
  name: string;
  fullName?: string;
  description?: string;
  orderTemplate?: string;
  type: number;
  parentName?: string;
  middleName?: string;
  childName?: string;
  tradeMarkId?: number;
  variantId?: number;
  basePrice: number;
  weight?: number;
  weightUnit?: string;
  unit?: string;
  conversionValue?: number;
  masterProductId?: number;
  attributesText?: string;
  isActive: boolean;
  isDirectSale: boolean;
  isRewardPoint?: boolean;
  allowsSale?: boolean;
  createdAt: string;
  updatedAt: string;
  tradeMark?: { id: number; name: string };
  variant?: { id: number; name: string };
  images?: { id: number; image: string }[];
  comboComponents?: ProductComponent[];
  inventories?: Inventory[];
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export const productsApi = {
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryIds?: string;
    isActive?: boolean;
    branchId?: number;
    branchIds?: number[];
  }): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.categoryIds)
      queryParams.append("categoryIds", params.categoryIds);
    if (params?.isActive !== undefined)
      queryParams.append("isActive", params.isActive.toString());
    if (params?.branchId)
      queryParams.append("branchId", params.branchId.toString());
    if (params?.branchIds) {
      params.branchIds.forEach((id) =>
        queryParams.append("branchIds", id.toString())
      );
    }

    return apiClient.get(`/products?${queryParams.toString()}`);
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

  updateRetailPrice: (id: number, basePrice: number): Promise<Product> => {
    return apiClient.put(`/products/${id}`, { basePrice });
  },
};
