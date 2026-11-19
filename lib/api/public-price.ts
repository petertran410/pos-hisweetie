import { apiClient } from "@/lib/config/api";
import type { PricePageAdmin, PricePageConfig, PriceCatalogEntry, PublicPriceData } from "@/lib/public-price/types";

/** Cấu hình bảng giá public (tab "Bảng giá public" trong Cài đặt › Mẫu báo giá). */
export const publicPriceApi = {
  get: (): Promise<PricePageAdmin> => apiClient.get("/public-price-page"),
  save: (config: PricePageConfig): Promise<PricePageAdmin> => apiClient.put("/public-price-page", { config }),
  preview: (config: PricePageConfig): Promise<{ data: PublicPriceData; catalog: PriceCatalogEntry[] }> =>
    apiClient.post("/public-price-page/preview", { config }),
  publish: (): Promise<PricePageAdmin> => apiClient.post("/public-price-page/publish", {}),
  discard: (): Promise<PricePageAdmin> => apiClient.post("/public-price-page/discard", {}),
};
