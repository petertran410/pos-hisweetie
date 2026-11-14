/**
 * API báo giá — backend /quotes (hisweetie_ban_hang_backend/src/quotes).
 */
import { API_URL, apiClient, getAuthHeaders } from "@/lib/config/api";
import type {
  Quote,
  QuoteFilters,
  QuoteListResponse,
  QuotePayload,
  QuoteStatus,
} from "@/lib/types/quote";

/** Phần sửa được của một báo giá (bỏ các trường backend quản lý). */
export function toPayload(q: Quote): QuotePayload {
  const payload: Partial<Quote> = { ...q };
  for (const k of ["id", "code", "createdBy", "createdAt", "updatedAt", "sentAt"] as const) delete payload[k];
  return payload as QuotePayload;
}

export const quotesApi = {
  getAll: (filters: QuoteFilters) => apiClient.get<QuoteListResponse>("/quotes", filters),

  getOne: (id: number) => apiClient.get<Quote>(`/quotes/${id}`),

  create: (payload: QuotePayload) => apiClient.post<Quote>("/quotes", payload),

  update: (id: number, payload: QuotePayload) => apiClient.put<Quote>(`/quotes/${id}`, payload),

  setStatus: (id: number, status: QuoteStatus) => apiClient.patch<Quote>(`/quotes/${id}/status`, { status }),

  /** Chỉ báo giá Nháp. */
  remove: (id: number) => apiClient.delete<{ ok: true }>(`/quotes/${id}`),

  /** Nhân bản — cũng là "Dùng mẫu này" từ Thư viện (bản mới là Nháp của người bấm). */
  duplicate: (id: number) => apiClient.post<Quote>(`/quotes/${id}/duplicate`),

  /** File .xlsx theo bố cục sheet báo giá tổng hợp. */
  exportExcel: async (id: number): Promise<Blob> => {
    const res = await fetch(`${API_URL}/quotes/${id}/export/excel`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Xuất Excel thất bại");
    return res.blob();
  },
};

/**
 * Mẫu thư viện của ngành hàng (cho nút "Thêm cả nhóm hàng"): ưu tiên cùng miền, rồi Toàn quốc;
 * trong đó chọn mẫu có nhiều khung giá trùng khoá với `tierKeys` (khung của mẫu báo giá đang chọn) nhất.
 */
export async function libraryFor(
  category: NonNullable<Quote["category"]>,
  region: Quote["region"],
  tierKeys: string[]
): Promise<Quote | null> {
  const { data } = await quotesApi.getAll({ tab: "library", category: [category], pageSize: 50 });
  const rank = (r: Quote["region"]) => (r === region ? 2 : r === "ALL" ? 1 : 0);
  const top = Math.max(-1, ...data.map((q) => rank(q.region)));
  const candidates = await Promise.all(data.filter((q) => rank(q.region) === top).map((q) => quotesApi.getOne(q.id)));
  const keys = new Set(tierKeys);
  const overlap = (q: Quote) => new Set(q.items.flatMap((it) => it.tiers.map((t) => t.key)).filter((k) => keys.has(k))).size;
  return candidates.reduce<Quote | null>((best, q) => (!best || overlap(q) > overlap(best) ? q : best), null);
}
