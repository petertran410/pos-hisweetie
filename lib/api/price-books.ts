import { apiClient } from "@/lib/config/api";

export interface PriceBook {
  id: number;
  name: string;
  isActive: boolean;
  isGlobal: boolean;
  startDate?: string;
  endDate?: string;
  allowNonListedProducts: boolean;
  warnNonListedProducts: boolean;
  priority: number;
  forAllCusGroup: boolean;
  forAllUser: boolean;
  createdAt: string;
  updatedAt: string;
  priceBookDetails?: PriceBookDetail[];
  priceBookBranches?: PriceBookBranch[];
  priceBookCustomerGroups?: PriceBookCustomerGroup[];
  priceBookUsers?: PriceBookUser[];
}

export interface PriceBookDetail {
  id: number;
  priceBookId: number;
  productId: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: number;
    code: string;
    name: string;
    retailPrice: number;
    stockQuantity: number;
    unit?: string;
    images?: { id: number; image: string }[];
  };
}

export interface PriceBookBranch {
  id: number;
  priceBookId: number;
  branchId: number;
  branchName: string;
  branch?: {
    id: number;
    name: string;
  };
}

export interface PriceBookCustomerGroup {
  id: number;
  priceBookId: number;
  customerGroupId: number;
  customerGroupName: string;
  customerGroup?: {
    id: number;
    name: string;
  };
}

export interface PriceBookUser {
  id: number;
  priceBookId: number;
  userId: number;
  userName: string;
  user?: {
    id: number;
    name: string;
  };
}

export interface PriceBooksResponse {
  data: PriceBook[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductPriceInfo {
  priceBookId: number | null;
  priceBookName: string | null;
  price: number;
  allowNonListedProducts: boolean;
  warnNonListedProducts: boolean;
  originalPrice: number;
}

export interface ProductWithPrices {
  id: number;
  code: string;
  name: string;
  purchasePrice: number;
  retailPrice: number;
  stockQuantity: number;
  unit?: string;
  prices: Record<number, number>;
}

export const priceBooksApi = {
  getPriceBooks: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    branchId?: number;
  }): Promise<PriceBooksResponse> => {
    return apiClient.get("/price-books", params);
  },

  getPriceBook: (id: number): Promise<PriceBook> => {
    return apiClient.get(`/price-books/${id}`);
  },

  createPriceBook: (data: any): Promise<PriceBook> => {
    return apiClient.post("/price-books", data);
  },

  updatePriceBook: (id: number, data: any): Promise<PriceBook> => {
    return apiClient.put(`/price-books/${id}`, data);
  },

  deletePriceBook: (id: number): Promise<void> => {
    return apiClient.delete(`/price-books/${id}`);
  },

  getApplicablePriceBooks: (params: {
    branchId?: number;
    customerId?: number;
    userId?: number;
    date?: string;
  }): Promise<PriceBook[]> => {
    return apiClient.get("/price-books/applicable", params);
  },

  getPriceForProduct: (params: {
    productId: number;
    branchId?: number;
    customerId?: number;
    userId?: number;
  }): Promise<ProductPriceInfo> => {
    return apiClient.get("/price-books/product-price", params);
  },

  getProductsByPriceBook: (
    priceBookId: number,
    search?: string
  ): Promise<PriceBookDetail[]> => {
    return apiClient.get(`/price-books/${priceBookId}/products`, { search });
  },

  addProductsToPriceBook: (
    priceBookId: number,
    products: { productId: number; price: number }[]
  ): Promise<PriceBook> => {
    return apiClient.post(`/price-books/${priceBookId}/products`, {
      products,
    });
  },

  removeProductsFromPriceBook: (
    priceBookId: number,
    productIds: number[]
  ): Promise<PriceBook> => {
    return apiClient.delete(`/price-books/${priceBookId}/products`, {
      productIds,
    });
  },

  updateProductPrice: (
    priceBookId: number,
    productId: number,
    price: number
  ): Promise<PriceBook> => {
    return apiClient.put(`/price-books/${priceBookId}/products/${productId}`, {
      price,
    });
  },

  getProductsWithPrices: (params: {
    priceBookIds: number[];
    search?: string;
    categoryId?: number;
  }): Promise<ProductWithPrices[]> => {
    return apiClient.get("/price-books/products-with-prices", {
      priceBookIds: params.priceBookIds.join(","),
      search: params.search,
      categoryId: params.categoryId,
    });
  },
};
