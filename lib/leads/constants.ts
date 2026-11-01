import type { LeadCategory, LeadSource, LeadStatus } from "@/lib/types/lead";

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  facebook: "Fanpage",
  tiktok: "Tiktok",
  shopee: "Shopee",
  zalo_oa: "Zalo OA",
  website: "Website",
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

// Nền tảng kênh Smax → nguồn lead (Zalo cá nhân không phải nguồn → để CSKH chọn)
export const PLATFORM_TO_SOURCE: Record<string, LeadSource> = {
  facebook: "facebook",
  instagram: "facebook",
  tiktok: "tiktok",
  tiktokweb: "tiktok",
  shopee: "shopee",
  zalo: "zalo_oa",
  custom: "website",
};

// Nguồn lead → nền tảng kênh Smax (để chọn "Kênh" theo nguồn)
export const SOURCE_PLATFORMS: Record<LeadSource, string[]> = {
  facebook: ["facebook", "instagram"],
  tiktok: ["tiktok", "tiktokweb"],
  shopee: ["shopee"],
  zalo_oa: ["zalo"],
  website: ["custom"],
};

// Kênh khách lạ nhắn tới (Facebook, Tiktok): ưu tiên tạo lead; chỉ gợi ý gắn khách POS khi trùng SĐT
export const LEAD_FIRST_PLATFORMS = new Set(["facebook", "tiktok", "tiktokweb"]);

export const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
