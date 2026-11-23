import { apiClient } from "@/lib/config/api";

/** Báo cáo chat cuối ngày (backend DailyReport) — AI tổng hợp hội thoại Smax trong ngày. */
export type DailyChatReport = {
  day: string;
  stats: { channels: number; threads: number; messages: number };
  complaints: {
    customer: string;
    channel: string;
    issue: string;
    handled: boolean;
  }[];
  pending: {
    customer: string;
    channel: string;
    request: string;
    since: string | null;
  }[];
  discrepancies: {
    product: string;
    prices: { price: number; customer: string; channel: string }[];
  }[];
  model: string;
  tokens: number;
};

export type DailySavedDay = {
  day: string;
  sentAt: string;
  /** false: gửi trước khi POS lưu chi tiết — chỉ có số liệu tóm tắt. */
  detail: boolean;
  threads: number;
  complaints: number;
  pending: number;
  discrepancies: number;
};

export type DailyPreview =
  | { status: "idle" }
  | {
      status: "running" | "done" | "error";
      day: string;
      report?: DailyChatReport;
      error?: string;
    };

export const dailyReportApi = {
  savedDays: (): Promise<DailySavedDay[]> =>
    apiClient.get("/ai/compose/daily-report/saved"),
  saved: (
    day: string,
  ): Promise<{ sentAt: string | null; report: DailyChatReport | null }> =>
    apiClient.get(`/ai/compose/daily-report/saved/${day}`),
  /** Bắt đầu tạo bản xem trước (chạy nền vài phút, không gửi Lark). */
  startPreview: (day: string): Promise<DailyPreview> =>
    apiClient.post(`/ai/compose/daily-report/preview?date=${day}`, {}),
  preview: (): Promise<DailyPreview> =>
    apiClient.get("/ai/compose/daily-report/preview"),
};
