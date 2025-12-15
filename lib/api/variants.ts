import { apiClient } from "@/lib/config/api";

export interface ProductVariant {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export const variantsApi = {
  getVariants: (): Promise<ProductVariant[]> => {
    return apiClient.get("/product-variants");
  },
};
