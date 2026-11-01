import { apiClient } from "@/lib/config/api";
import type {
  Lead,
  LeadDetail,
  LeadDuplicates,
  LeadFilters,
  LeadHandover,
  LeadInput,
  LeadTemplates,
} from "@/lib/types/lead";

export const leadsApi = {
  list: (f: LeadFilters): Promise<{ data: Lead[]; total: number; page: number; limit: number }> =>
    apiClient.get("/leads", f as Record<string, unknown>),
  get: (id: number): Promise<LeadDetail> => apiClient.get(`/leads/${id}`),
  create: (body: LeadInput): Promise<{ lead: Lead; duplicates: LeadDuplicates }> => apiClient.post("/leads", body),
  update: (id: number, body: LeadInput): Promise<{ lead: Lead; duplicates: LeadDuplicates }> =>
    apiClient.patch(`/leads/${id}`, body),
  checkPhone: (phone: string, excludeId?: number): Promise<LeadDuplicates> =>
    apiClient.get("/leads/check-phone", { phone, ...(excludeId ? { excludeId } : {}) }),
  removeConversation: (id: number, conversationId: number) =>
    apiClient.delete(`/leads/${id}/conversations/${conversationId}`),
  convert: (id: number, customerId: number) => apiClient.post(`/leads/${id}/convert`, { customerId }),
  handoverCheck: (
    id: number,
    salePicId?: number,
    pagePid?: string
  ): Promise<{ ok: boolean; reasons: string[]; channels: { pagePid: string; name: string; connectionError: boolean }[] }> =>
    apiClient.get(`/leads/${id}/handover-check`, {
      ...(salePicId ? { salePicId } : {}),
      ...(pagePid ? { pagePid } : {}),
    }),
  handoverPreview: (id: number, salePicId: number, note?: string): Promise<{ larkText: string; friendMessage: string; greeting: string }> =>
    apiClient.get(`/leads/${id}/handover-preview`, { salePicId, ...(note ? { note } : {}) }),
  handover: (
    id: number,
    body: { salePicId: number; pagePid: string; note?: string; larkText: string; friendMessage: string; greeting: string; confirmed: true }
  ): Promise<{ handover: LeadHandover; done: boolean }> => apiClient.post(`/leads/${id}/handover`, body, 120_000),
  retryHandover: (handoverId: number): Promise<{ handover: LeadHandover; done: boolean }> =>
    apiClient.post(`/leads/handovers/${handoverId}/retry`, { confirmed: true }, 120_000),
  channels: (): Promise<{ pagePid: string; name: string; platform: string }[]> => apiClient.get("/leads/channels"),
  // Sale nhận lead: nhân sự phòng ban Lark "Bộ Phận Sales" (filtered=false: Lark lỗi → mọi nhân sự)
  saleCandidates: (): Promise<{ users: { id: number; name: string }[]; filtered: boolean; department: string }> =>
    apiClient.get("/leads/sales"),
  templates: (): Promise<LeadTemplates> => apiClient.get("/leads/templates"),
  saveTemplates: (body: { greeting?: string; friend?: string; lark?: string }): Promise<LeadTemplates> =>
    apiClient.put("/leads/templates", body),
};
