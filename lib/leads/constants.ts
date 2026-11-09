import type { LeadCandidate, LeadCategory, LeadLinkMethod, LeadSource, LeadStatus } from "@/lib/types/lead";

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  facebook: "Fanpage",
  tiktok: "Tiktok",
  shopee: "Shopee",
  zalo_oa: "Zalo OA",
  zalo_user: "Zalo User",
  website: "Website",
  direct: "Trực tiếp",
  other: "Khác",
};

export const LEAD_CATEGORY_LABEL: Record<LeadCategory, string> = {
  cafe: "Khách quán",
  chain: "Khách chuỗi",
  distributor: "Đại lý nguyên liệu",
  training: "Đào tạo/Set up",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Mới",
  caring: "Đang chăm sóc",
  handed_over: "Đã chuyển Sale",
  converted: "Đã chuyển đổi",
  cancelled: "Huỷ",
};

export const LEAD_STATUS_COLOR: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-700",
  caring: "bg-amber-100 text-amber-700",
  handed_over: "bg-violet-100 text-violet-700",
  converted: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export const LEAD_LINK_METHOD_LABEL: Record<LeadLinkMethod, string> = {
  zalo: "ID Zalo",
  conversation: "Hội thoại",
  phone: "SĐT",
  manual: "Gắn tay",
  created: "Tạo từ lead",
  unlinked: "Đã gỡ",
};

export const LEAD_CANDIDATE_REASON_LABEL: Record<LeadCandidate["reason"], string> = {
  zalo: "trùng ID Zalo",
  conversation: "trùng hội thoại",
  phone: "trùng SĐT",
  thread_phone: "SĐT trong hội thoại",
};

// Nền tảng kênh Smax → nguồn lead
export const PLATFORM_TO_SOURCE: Record<string, LeadSource> = {
  facebook: "facebook",
  instagram: "facebook",
  tiktok: "tiktok",
  tiktokweb: "tiktok",
  shopee: "shopee",
  zalo: "zalo_oa",
  zaloweb: "zalo_user",
  custom: "website",
};

// Nguồn lead → nền tảng kênh Smax (để chọn "Kênh" theo nguồn)
export const SOURCE_PLATFORMS: Record<LeadSource, string[]> = {
  facebook: ["facebook", "instagram"],
  tiktok: ["tiktok", "tiktokweb"],
  shopee: ["shopee"],
  zalo_oa: ["zalo"],
  zalo_user: ["zaloweb"],
  website: ["custom"],
  direct: [],
  other: [],
};

// Nguồn không có kênh Smax: chọn kênh trong danh sách cố định (lưu tên kênh, không có pagePid)
export const SOURCE_CHANNEL_NAMES: Partial<Record<LeadSource, string[]>> = {
  direct: ["Hội chợ", "Workshop"],
};

// Kênh khách lạ nhắn tới (Facebook, Tiktok): ưu tiên tạo lead; chỉ gợi ý gắn khách POS khi trùng SĐT
export const LEAD_FIRST_PLATFORMS = new Set(["facebook", "tiktok", "tiktokweb"]);

/** Mã lead hiển thị: LEAD + id 6 chữ số (khớp tìm kiếm ở backend). */
export const leadCode = (id: number) => `LEAD${String(id).padStart(6, "0")}`;
/** Link mở lead theo mã (giống /khach-hang?Code=); trang lead vẫn nhận ?id= của link cũ. */
export const leadHref = (id: number) => `/khach-hang/lead?Code=${leadCode(id)}`;

export const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
