import { apiClient } from "@/lib/config/api";
import type {
  IntelControl,
  IntelExclusion,
  IntelMessagesResult,
  IntelOverview,
  IntelStatus,
  IntelThreadHit,
  CustomerIntelSummary,
  ReviewItem,
  ReviewLabels,
  ReviewSummary,
  SandboxResult,
} from "@/lib/types/messageIntel";

export type IntelRangeParams = { from: string; to: string; pagePid?: string };
export type IntelMessagesParams = IntelRangeParams & {
  status?: string;
  intent?: string;
  topic?: string;
  sentiment?: string;
  flag?: "anomaly" | "escalation" | "reply";
  page: number;
  limit: number;
};

/** Message Intelligence (`/message-intel`): xem cần message_intel:view, điều khiển cần message_intel:manage. */
export const messageIntelApi = {
  status: (): Promise<IntelStatus> => apiClient.get("/message-intel/status"),
  overview: (p: IntelRangeParams): Promise<IntelOverview> => apiClient.get("/message-intel/overview", p),
  messages: (p: IntelMessagesParams): Promise<IntelMessagesResult> => apiClient.get("/message-intel/messages", p),
  nextReview: (): Promise<{ item: ReviewItem | null; done: number; total: number }> =>
    apiClient.get("/message-intel/reviews/next"),
  saveReview: (body: { msgPid: string; labels: ReviewLabels; note?: string }): Promise<{ ok: true }> =>
    apiClient.post("/message-intel/reviews", body),
  reviewSummary: (): Promise<ReviewSummary> => apiClient.get("/message-intel/reviews/summary"),
  // Gọi Jev thật: ~0,3–1 giây, chừa thời gian
  sandbox: (body: {
    text: string;
    isGroup: boolean;
    previous: { role: "staff" | "customer"; text: string }[];
  }): Promise<SandboxResult> => apiClient.post("/message-intel/sandbox", body, 60_000),
  control: (body: IntelControl): Promise<unknown> => apiClient.post("/message-intel/control", body),
  /** Hội thoại loại trừ (không gửi AI phân loại): message_intel:manage */
  exclusions: (): Promise<IntelExclusion[]> => apiClient.get("/message-intel/exclusions"),
  searchThreads: (q: string): Promise<IntelThreadHit[]> => apiClient.get("/message-intel/exclusions/threads", { q }),
  exclude: (body: { pagePid: string; tid: string }): Promise<{ groupKey: string; threads: number; skipped: number }> =>
    apiClient.post("/message-intel/exclusions", body),
  include: (body: { groupKey?: string; pagePid?: string; tid?: string }): Promise<{ groupKey: string; requeued: number }> =>
    apiClient.post("/message-intel/exclusions/remove", body),
  /** Khung chat (smax_chat:view): hồ sơ AI của khách POS */
  customerSummary: (customerId: number): Promise<CustomerIntelSummary> =>
    apiClient.get(`/message-intel/customers/${customerId}/summary`),
};
