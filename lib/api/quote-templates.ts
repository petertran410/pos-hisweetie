/**
 * API mẫu báo giá (Cài đặt › Mẫu báo giá) — backend /quote-templates.
 * Không có xoá: chỉ Ngừng sử dụng / Dùng lại.
 */
import { apiClient } from "@/lib/config/api";
import type { QuoteTemplateConfig, QuoteTemplatePayload } from "@/lib/types/quote";

export const quoteTemplatesApi = {
  getAll: () => apiClient.get<QuoteTemplateConfig[]>("/quote-templates"),

  create: (payload: QuoteTemplatePayload) => apiClient.post<QuoteTemplateConfig>("/quote-templates", payload),

  update: (id: number, payload: QuoteTemplatePayload) =>
    apiClient.put<QuoteTemplateConfig>(`/quote-templates/${id}`, payload),

  /** Đặt làm mẫu mặc định của nhóm khách. */
  setDefault: (id: number) => apiClient.patch<QuoteTemplateConfig>(`/quote-templates/${id}/default`),

  /** Ngừng sử dụng / dùng lại. Mẫu mặc định không ngừng được. */
  setActive: (id: number, isActive: boolean) =>
    apiClient.patch<QuoteTemplateConfig>(`/quote-templates/${id}/active`, { isActive }),
};
