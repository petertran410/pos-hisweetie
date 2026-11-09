import { apiClient } from "@/lib/config/api";

export interface SmaxZaloChannel {
  pagePid: string;
  name: string;
  // zaloweb (Zalo cá nhân), zalo (OA), facebook, instagram, tiktokweb, shopee, custom (website)…
  platform: string;
  active: boolean;
  // Mất kết nối Zalo (token lỗi) — Smax vẫn để active=true
  connectionError: { at: string; note: string | null } | null;
  // Đã liên kết nhưng kênh không còn trên Smax
  missing: boolean;
  // 1 kênh gắn được nhiều người dùng POS
  users: { id: number; name: string; email: string; phone?: string | null }[];
}

/** Tình trạng token đăng nhập Smax (backend không trả nguyên token). */
export interface SmaxUserTokenStatus {
  // db = lưu trên POS (trang này), env = SMAX_USER_TOKEN trong .env backend, null = chưa có
  source: "db" | "env" | null;
  envConfigured: boolean;
  last4: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  // null = chưa có token để kiểm tra
  valid: boolean | null;
  error: string | null;
}

export const smaxApi = {
  getUserToken: (): Promise<SmaxUserTokenStatus> => apiClient.get("/smax/user-token"),
  setUserToken: (token: string): Promise<SmaxUserTokenStatus> => apiClient.put("/smax/user-token", { token }),
  clearUserToken: (): Promise<SmaxUserTokenStatus> => apiClient.delete("/smax/user-token"),

  getZaloChannels: (): Promise<SmaxZaloChannel[]> =>
    apiClient.get("/smax/zalo-channels"),

  // Tải lại kênh từ Smax, cập nhật tên kênh đã lưu của các liên kết
  syncChannels: (): Promise<{ channels: SmaxZaloChannel[]; updated: number }> =>
    apiClient.post("/smax/zalo-channels/sync", {}),

  linkChannel: (pagePid: string, userId: number) =>
    apiClient.put(`/smax/zalo-channels/${encodeURIComponent(pagePid)}`, {
      userId,
    }),

  // userId bỏ trống = gỡ hết người dùng khỏi kênh
  unlinkChannel: (pagePid: string, userId?: number) =>
    apiClient.delete(
      `/smax/zalo-channels/${encodeURIComponent(pagePid)}${userId ? `?userId=${userId}` : ""}`
    ),
};
