export type LeadSource = "facebook" | "tiktok" | "shopee" | "zalo_oa" | "zalo_user" | "website" | "direct" | "other";
export type LeadCategory = "cafe" | "chain" | "distributor" | "training";
export type LeadStatus = "new" | "caring" | "handed_over" | "converted" | "cancelled";
/** Cách gắn khách POS; "unlinked" = đã gỡ tay (không tự gắn lại) */
export type LeadLinkMethod = "zalo" | "conversation" | "phone" | "manual" | "created" | "unlinked";

/** Hội thoại Smax (Facebook, Tiktok, Zalo…) gắn với lead. */
export interface LeadConversation {
  id: number;
  pagePid: string;
  tid: string;
  platform: string;
  isGroup: boolean;
  name: string | null;
}

export type HandoverStepKey = "lark" | "friend" | "greeting";
export interface HandoverStep {
  /** skipped: lỗi chấp nhận được (khách chặn tin người lạ), không chặn hoàn tất chuyển giao */
  status: "pending" | "ok" | "failed" | "skipped";
  at?: string;
  error?: string;
  /** Người xác nhận đúng SĐT khách khi không tìm thấy Zalo (bước tính hoàn tất) */
  confirmedBy?: string;
}

export interface LeadHandover {
  id: number;
  salePicId: number;
  salePicName: string | null;
  createdByName: string | null;
  pagePid: string;
  note: string | null;
  larkText: string;
  friendMessage: string;
  greeting: string;
  steps: Record<HandoverStepKey, HandoverStep>;
  status: "done" | "partial";
  createdAt: string;
}

export interface Lead {
  id: number;
  name: string;
  phone: string | null;
  zaloPhone: string | null;
  source: LeadSource;
  // Kênh (page Smax) khách nhắn tới, vd Fanpage "LerMao - Sành Ăn Như Gấu"
  channelPid: string | null;
  channelName: string | null;
  category: LeadCategory;
  provinceCode: string | null;
  provinceName: string | null;
  wardCode: string | null;
  wardName: string | null;
  need: string | null;
  status: LeadStatus;
  cskhUserId: number | null;
  salePicId: number | null;
  cskhNote: string | null;
  customerId: number | null;
  linkMethod: LeadLinkMethod | null;
  linkedAt: string | null;
  /** Ngày đơn đặt hàng đầu của khách đã gắn */
  convertedAt: string | null;
  createdAt: string;
  cskhUser: { id: number; name: string } | null;
  salePic: { id: number; name: string } | null;
  /** Lead chưa có Sale PIC → lấy Sale PIC của khách POS đã gắn */
  salePicFromCustomer?: boolean;
  // Khách POS: đã chuyển đổi (customerId) + khách đã gắn hội thoại của lead
  customers: { id: number; code: string | null; name: string }[];
}

/** Khách gợi ý gắn với lead; auto = khớp chắc chắn (hệ thống tự gắn). */
export interface LeadCandidate {
  id: number;
  code: string | null;
  name: string;
  reason: "zalo" | "conversation" | "phone" | "thread_phone";
  auto: boolean;
}

export interface LeadDetail extends Lead {
  conversations: LeadConversation[];
  /** Chưa gắn khách: khách khớp ID Zalo / hội thoại / SĐT */
  candidates: LeadCandidate[];
  handovers: LeadHandover[];
  /** Các lần khách gửi form thu thập lead (mới nhất trước) */
  formSubmissions: {
    id: number;
    answers: { key: string; label: string; value: string }[];
    merged: boolean;
    createdAt: string;
    form: { id: number; name: string };
  }[];
}

export interface LeadFilters {
  q?: string;
  sources?: string;
  categories?: string;
  statuses?: string;
  provinceCode?: string;
  salePicId?: number;
  /** Đã gắn khách POS */
  linked?: "true" | "false";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface LeadInput {
  name?: string;
  phone?: string;
  zaloPhone?: string;
  source?: LeadSource;
  channelPid?: string;
  channelName?: string;
  category?: LeadCategory;
  provinceCode?: string;
  provinceName?: string;
  wardCode?: string;
  wardName?: string;
  need?: string;
  status?: LeadStatus;
  cskhUserId?: number;
  cskhNote?: string;
  conversation?: Omit<LeadConversation, "id" | "name"> & { name?: string };
}

export interface LeadDuplicates {
  customers: { id: number; code: string | null; name: string }[];
  leads: { id: number; name: string; status: LeadStatus }[];
}

export interface LeadTemplates {
  greeting: string;
  friend: string;
  lark: string;
  defaults: { greeting: string; friend: string; lark: string };
}

/** Hành trình khách: lead → chuyển Sale → mã KH → đặt hàng → hóa đơn. */
export interface JourneyMilestone {
  key: "lead" | "handover" | "customer" | "order" | "invoice";
  label: string;
  at: string | null;
  done: boolean;
  ref: string | null;
  /** Nhãn kèm mốc, vd "Khách cũ" (có mã KH trước khi có lead) */
  note?: string | null;
  /** Chưa đạt nhưng có đơn / hóa đơn trước khi có lead (khách cũ) → hiện vàng */
  warn?: boolean;
}

export interface JourneyEvent {
  at: string;
  type: "lead" | "form" | "update" | "handover" | "link" | "convert" | "customer" | "order" | "invoice";
  title: string;
  by?: string | null;
  status?: string | null;
  ref?: { kind: "lead" | "customer" | "order" | "invoice"; code: string } | null;
}

export interface CustomerJourney {
  lead: {
    id: number;
    code: string;
    name: string;
    source: LeadSource;
    channelName: string | null;
    category: LeadCategory;
    status: LeadStatus;
    cskh: { id: number; name: string } | null;
    salePic: { id: number; name: string } | null;
    createdAt: string;
    linkMethod: LeadLinkMethod | null;
    linkedAt: string | null;
    convertedAt: string | null;
  } | null;
  otherLeads: { id: number; code: string }[];
  customer: { id: number; code: string | null; name: string; createdAt: string } | null;
  milestones: JourneyMilestone[];
  events: JourneyEvent[];
}
