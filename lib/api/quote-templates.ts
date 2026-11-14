/**
 * API mẫu báo giá (Cài đặt › Mẫu báo giá) — backend /quote-templates.
 * Không có xoá: chỉ Ngừng sử dụng / Dùng lại.
 */
import { API_URL, apiClient, getAuthHeaders } from "@/lib/config/api";
import type { QuoteTemplateConfig, QuoteTemplatePayload } from "@/lib/types/quote";

export const quoteTemplatesApi = {
  getAll: () => apiClient.get<QuoteTemplateConfig[]>("/quote-templates"),

  create: (payload: QuoteTemplatePayload) => apiClient.post<QuoteTemplateConfig>("/quote-templates", payload),

  update: (id: number, payload: QuoteTemplatePayload) =>
    apiClient.put<QuoteTemplateConfig>(`/quote-templates/${id}`, payload),

  /** Đặt làm mẫu mặc định. */
  setDefault: (id: number) => apiClient.patch<QuoteTemplateConfig>(`/quote-templates/${id}/default`),

  /** Ngừng sử dụng / dùng lại. Mẫu mặc định không ngừng được. */
  setActive: (id: number, isActive: boolean) =>
    apiClient.patch<QuoteTemplateConfig>(`/quote-templates/${id}/active`, { isActive }),

  /** Tải logo đầu trang (dùng /upload/image chung) → URL ảnh. */
  uploadLogo: async (file: File): Promise<string> => {
    const headers = getAuthHeaders();
    delete headers["Content-Type"]; // multipart: để trình duyệt tự đặt boundary
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`${API_URL}/upload/image?subfolder=bao-gia`, { method: "POST", headers, body });
    if (!res.ok) throw new Error("Tải logo thất bại");
    return ((await res.json()) as { url: string }).url;
  },
};
