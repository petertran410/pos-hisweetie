// Hợp đồng dữ liệu Dashboard Lead (/bao-cao/lead).
// API: GET /reports/leads/summary trả LeadDashboardData; GET /reports/leads/filter-options trả LeadFilterOptions.
// Backend giữ bản sao ở hisweetie_ban_hang_backend/src/leads/lead-reports/lead-reports.types.ts (sửa cả hai).
// Nguồn / phân loại / trạng thái dùng lại kiểu domain có sẵn ở lib/types/lead.

import type {
  HandoverStepKey,
  LeadCategory,
  LeadSource,
  LeadStatus,
} from "@/lib/types/lead";

export type { HandoverStepKey, LeadCategory, LeadSource, LeadStatus };

/** Thứ tự hiển thị nguồn trên mọi biểu đồ/bảng. */
export const LEAD_SOURCE_ORDER: LeadSource[] = [
  "facebook",
  "tiktok",
  "shopee",
  "zalo_oa",
  "zalo_user",
  "website",
  "direct",
  "other",
];

/** Nhãn bước chuyển giao (HandoverStepKey) cho mục "Chuyển giao có bước lỗi". */
export const HANDOVER_STEP_LABEL: Record<HandoverStepKey, string> = {
  lark: "Báo Lark",
  friend: "Kết bạn Zalo",
  greeting: "Gửi lời chào",
};

// ───────────────────────── Bộ lọc (request) ─────────────────────────

export type LeadGranularity = "day" | "week" | "month";

export interface LeadDashboardFilters {
  /** ISO; null = toàn thời gian (cùng quy ước rangeToIso của TimeRangeFilter). */
  from: string | null;
  to: string | null;
  /** Rỗng = tất cả. */
  sources: LeadSource[];
  categories: LeadCategory[];
  cskhUserId: number | null;
  salePicId: number | null;
}

export interface LeadStaffOption {
  id: number;
  name: string;
}

/** Tuỳ chọn cho bộ lọc (API giai đoạn 2 có thể trả cùng response hoặc endpoint riêng). */
export interface LeadFilterOptions {
  cskh: LeadStaffOption[];
  salePics: LeadStaffOption[];
}

// ───────────────────────── Dữ liệu (response) ─────────────────────────

/** Một chỉ số + giá trị kỳ trước. changePct = (value - previous) / previous * 100; null khi previous = 0. */
export interface LeadKpi {
  value: number;
  previous: number;
  changePct: number | null;
}

/** Chỉ số thời gian (giờ): null khi chưa có lead nào đủ điều kiện để tính. */
export interface LeadDurationKpi {
  value: number | null;
  previous: number | null;
  changePct: number | null;
}

export interface LeadKpis {
  /** Lead tạo trong kỳ. */
  total: LeadKpi;
  /** Các số dưới đây là trạng thái HIỆN TẠI của lead tạo trong kỳ (tổng 5 trạng thái = total). */
  newLeads: LeadKpi;
  caring: LeadKpi;
  handedOver: LeadKpi;
  converted: LeadKpi;
  /** Đơn vị %, 0–100. value = converted / (total − cancelled). */
  conversionRate: LeadKpi & {
    /** Tham khảo: converted / total (kể cả lead Huỷ). */
    rateOfAllLeads: number;
  };
  /** Đơn vị giờ. Trung bình (createdAt → lần chuyển giao đầu) của lead đã chuyển giao. */
  avgHoursToHandover: LeadDurationKpi;
  /** Đơn vị giờ. Trung bình (createdAt → convertedAt) của lead đã chuyển đổi. */
  avgHoursToFirstOrder: LeadDurationKpi;
}

export type LeadFunnelStageKey =
  | "lead"
  | "caring"
  | "handed_over"
  | "has_customer"
  | "ordered";

export interface LeadFunnelStage {
  key: LeadFunnelStageKey;
  label: string;
  /** Số lead ĐÃ ĐI QUA tầng này (lũy kế, nên giảm dần). */
  count: number;
  /** % so với tầng đầu. */
  pctOfTop: number;
  /** % rơi so với tầng trước; null ở tầng đầu. */
  dropPct: number | null;
  /** Số lead rơi so với tầng trước; null ở tầng đầu. */
  dropCount: number | null;
}

export interface LeadSourceRow {
  source: LeadSource;
  leads: number;
  converted: number;
  /** converted / (leads − huỷ) * 100. */
  conversionRate: number;
  /** leads / tổng lead * 100. */
  sharePct: number;
  previousLeads: number;
  /** null khi previousLeads = 0. */
  leadsChangePct: number | null;
}

export interface LeadCskhRow {
  /** 0 = lead chưa gán CSKH. */
  userId: number;
  name: string;
  /** Lead được giao. */
  received: number;
  /** Đã chăm sóc (rời trạng thái Mới). */
  cared: number;
  handedOver: number;
  converted: number;
  /** converted / (received − huỷ) * 100. */
  conversionRate: number;
  /** Phút TB từ lúc lead vào đến lần đầu rời "Mới" hoặc chuyển giao; null khi chưa có mốc. */
  avgFirstResponseMinutes: number | null;
  /** Lead Mới quá 24 giờ chưa chăm sóc. */
  overdueNew: number;
}

export interface LeadSalePicRow {
  userId: number;
  name: string;
  /** Lead được chuyển cho Sale PIC. */
  received: number;
  /** Đã có mã KH. */
  withCustomer: number;
  /** Đã có đơn đầu. */
  ordered: number;
  /** ordered / (received − huỷ) * 100. */
  conversionRate: number;
  /** Ngày trung bình từ lúc chuyển Sale đến đơn đầu; null khi chưa có đơn. */
  avgDaysToFirstOrder: number | null;
  /** Đã chuyển Sale quá 14 ngày chưa có đơn. */
  overdueNoOrder: number;
}

/** Điểm xu hướng. key: "2026-10-05" (day) | "2026-W41" (week) | "2026-10" (month). */
export interface LeadTrendPoint {
  key: string;
  label: string;
  newLeads: number;
  converted: number;
}

export type LeadTrend = Record<LeadGranularity, LeadTrendPoint[]>;

// ── Khối "Cần xử lý" ──

export interface LeadAttentionBase {
  leadId: number;
  name: string;
  source: LeadSource;
}

/** Lead Mới quá 24 giờ chưa chăm sóc. */
export interface LeadStaleNewItem extends LeadAttentionBase {
  createdAt: string;
  hoursOpen: number;
  cskhName: string | null;
}

/** Chuyển giao có ít nhất 1 bước failed (LeadHandover.status = "partial"). */
export interface LeadHandoverErrorItem extends LeadAttentionBase {
  handoverId: number;
  failedStep: HandoverStepKey;
  error: string;
  at: string;
  salePicName: string | null;
  createdByName: string | null;
}

/** Đã chuyển Sale quá 14 ngày chưa có đơn. */
export interface LeadStaleHandedItem extends LeadAttentionBase {
  handedAt: string;
  daysSinceHandover: number;
  hasCustomer: boolean;
  salePicName: string | null;
}

export interface LeadAttentionList<T> {
  /** Tổng số mục (items có thể bị cắt top N). */
  total: number;
  items: T[];
}

export interface LeadAttention {
  staleNew: LeadAttentionList<LeadStaleNewItem>;
  handoverErrors: LeadAttentionList<LeadHandoverErrorItem>;
  staleHanded: LeadAttentionList<LeadStaleHandedItem>;
}

export interface LeadDashboardData {
  period: {
    /** null = toàn thời gian. */
    from: string | null;
    to: string | null;
    /** Vd "Tháng 10/2026". */
    label: string;
    /** Vd "Tháng 9/2026"; null khi không có kỳ trước (toàn thời gian). */
    compareLabel: string | null;
  };
  /** Mốc tính "quá 24 giờ / 14 ngày". Khối "Cần xử lý" là tồn đọng hiện tại, không giới hạn theo kỳ. */
  asOf: string;
  kpis: LeadKpis;
  funnel: LeadFunnelStage[];
  bySource: LeadSourceRow[];
  cskh: LeadCskhRow[];
  salePic: LeadSalePicRow[];
  trend: LeadTrend;
  attention: LeadAttention;
}
