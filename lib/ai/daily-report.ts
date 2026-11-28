import { apiClient } from "@/lib/config/api";

/** Báo cáo chat cuối ngày (backend DailyReport) — AI tổng hợp hội thoại Smax trong ngày. */
export type DailyChatReport = {
  day: string;
  stats: {
    channels: number;
    threads: number;
    messages: number;
    /** Hội thoại AI phân loại toàn tin bình thường → không đưa vào báo cáo */
    normal?: number;
  };
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

/** Một bản đã gửi Lark (`sent`) hoặc đã lưu từ bản xem trước. */
export type DailySavedReport = {
  id: number;
  day: string;
  at: string;
  sent: boolean;
  /** Người gửi / lưu ("System" = cron 18:00). */
  by: string;
  /** Bản đã lưu này được gửi Lark sau đó lúc nào (null: chưa). */
  sentLaterAt: string | null;
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
      /** Đã gửi bản xem trước này vào Lark. */
      sentAt?: string;
      /** Đã lưu bản xem trước này. */
      savedAt?: string;
    };

export const dailyReportApi = {
  savedReports: (): Promise<DailySavedReport[]> =>
    apiClient.get("/ai/compose/daily-report/saved"),
  saved: (
    id: number,
  ): Promise<{
    at: string | null;
    sent: boolean;
    by: string | null;
    sentLaterAt: string | null;
    report: DailyChatReport | null;
  }> => apiClient.get(`/ai/compose/daily-report/saved/${id}`),
  /** Bắt đầu tạo bản xem trước (chạy nền vài phút, không gửi Lark). */
  startPreview: (day: string): Promise<DailyPreview> =>
    apiClient.post(`/ai/compose/daily-report/preview?date=${day}`, {}),
  preview: (): Promise<DailyPreview> =>
    apiClient.get("/ai/compose/daily-report/preview"),
  /** Gửi bản xem trước đang có vào nhóm Lark (đúng nội dung đang xem, không chạy AI lại). */
  sendPreview: (): Promise<{ sent: true; day: string; sentAt: string }> =>
    apiClient.post("/ai/compose/daily-report/preview/send", {}),
  /** Gửi một bản đã lưu vào nhóm Lark (mỗi bản lưu gửi một lần). */
  sendSaved: (id: number): Promise<{ sent: true; day: string }> =>
    apiClient.post(`/ai/compose/daily-report/saved/${id}/send`, {}),
  /** Lưu bản xem trước đang có (không gửi Lark) để xem lại sau. */
  savePreview: (): Promise<{ saved: true; day: string; savedAt: string }> =>
    apiClient.post("/ai/compose/daily-report/preview/save", {}),
};
