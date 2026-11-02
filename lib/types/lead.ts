export type LeadSource = "facebook" | "tiktok" | "shopee" | "zalo_oa" | "website" | "direct" | "other";
export type LeadCategory = "cafe" | "chain" | "distributor" | "training";
export type LeadStatus = "new" | "caring" | "handed_over" | "converted" | "cancelled";

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
  status: "pending" | "ok" | "failed";
  at?: string;
  error?: string;
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
  createdAt: string;
  cskhUser: { id: number; name: string } | null;
  salePic: { id: number; name: string } | null;
  /** Lead chưa có Sale PIC → lấy Sale PIC của khách POS đã gắn */
  salePicFromCustomer?: boolean;
  // Khách POS: đã chuyển đổi (customerId) + khách đã gắn hội thoại của lead
  customers: { id: number; code: string | null; name: string }[];
}

export interface LeadDetail extends Lead {
  conversations: LeadConversation[];
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
