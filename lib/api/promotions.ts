import { apiClient } from "@/lib/config/api";
import {
  Promotion,
  PromotionFilters,
  PromotionLog,
  PromotionUsage,
  CreatePromotionPayload,
  EvaluateItem,
  EvaluateResult,
} from "@/lib/types/promotion";

export const promotionsApi = {
  list: (filters?: PromotionFilters): Promise<{ data: Promotion[]; total: number }> =>
    apiClient.get("/promotions", filters),

  detail: (id: number): Promise<Promotion> => apiClient.get(`/promotions/${id}`),

  logs: (id: number): Promise<PromotionLog[]> => apiClient.get(`/promotions/${id}/logs`),

  usage: (id: number): Promise<PromotionUsage> =>
    apiClient.get(`/promotions/${id}/usage`),

  create: (data: CreatePromotionPayload): Promise<Promotion> =>
    apiClient.post("/promotions", data),

  update: (id: number, data: Partial<CreatePromotionPayload>): Promise<Promotion> =>
    apiClient.put(`/promotions/${id}`, data),

  toggle: (id: number, isActive: boolean): Promise<Promotion> =>
    apiClient.patch(`/promotions/${id}/toggle`, { isActive }),

  stop: (id: number): Promise<Promotion> =>
    apiClient.patch(`/promotions/${id}/stop`),

  evaluate: (payload: {
    branchId: number;
    customerId?: number;
    userId?: number;
    purchaseDate?: string;
    items: EvaluateItem[];
  }): Promise<EvaluateResult> => apiClient.post("/promotions/evaluate", payload),
};
