// Tên loại kênh Smax (page.platform) hiển thị trên POS
export const PLATFORM_LABEL: Record<string, string> = {
  zaloweb: "Zalo cá nhân",
  zalo: "Zalo OA",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "Tiktok",
  tiktokweb: "Tiktok",
  shopee: "Shopee",
  custom: "Website",
};

export const platformLabel = (platform: string | null | undefined) =>
  (platform && PLATFORM_LABEL[platform]) || platform || "Zalo cá nhân";
