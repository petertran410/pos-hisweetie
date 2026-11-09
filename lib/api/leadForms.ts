import { apiClient } from "@/lib/config/api";
import type { LeadForm, LeadFormInput, LeadFormSubmission, PublicLeadForm } from "@/lib/types/leadForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Gọi API công khai (không gắn token, không chuyển về trang đăng nhập khi lỗi). */
async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/public/lead-forms/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Backend bọc lỗi: message là chuỗi, mảng (validate) hoặc { message }
    const raw = body?.message?.message ?? body?.message;
    const msg = Array.isArray(raw) ? raw[0] : raw;
    throw new Error(typeof msg === "string" && msg ? msg : "Có lỗi xảy ra, vui lòng thử lại");
  }
  return body as T;
}

export const leadFormsApi = {
  list: (): Promise<LeadForm[]> => apiClient.get("/lead-forms"),
  create: (data: LeadFormInput): Promise<LeadForm> => apiClient.post("/lead-forms", data),
  update: (id: number, data: LeadFormInput): Promise<LeadForm> => apiClient.patch(`/lead-forms/${id}`, data),
  remove: (id: number) => apiClient.delete(`/lead-forms/${id}`),
  submissions: (
    id: number,
    page: number,
    limit = 20
  ): Promise<{ data: LeadFormSubmission[]; total: number; page: number; limit: number }> =>
    apiClient.get(`/lead-forms/${id}/submissions`, { page, limit }),

  publicGet: (slug: string) => publicFetch<PublicLeadForm>(encodeURIComponent(slug)),
  publicSubmit: (slug: string, answers: Record<string, unknown>, website: string) =>
    publicFetch<{ ok: boolean; message: string }>(`${encodeURIComponent(slug)}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers, website }),
    }),
};
