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

/** user = token đăng nhập (SMAX_USER_TOKEN); api = Partner API token (SMAX_API_TOKEN). */
export type SmaxTokenKind = "user" | "api";

/** Tình trạng token Smax (backend không trả nguyên token). */
export interface SmaxTokenStatus {
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
  // Token dùng được nhưng có vấn đề (vd Smax trả 0 hội thoại / thiếu quyền)
  warning?: string | null;
}

export const smaxApi = {
  getToken: (kind: SmaxTokenKind): Promise<SmaxTokenStatus> => apiClient.get(`/smax/${kind}-token`),
  setToken: (kind: SmaxTokenKind, token: string): Promise<SmaxTokenStatus> =>
    apiClient.put(`/smax/${kind}-token`, { token }),
  clearToken: (kind: SmaxTokenKind): Promise<SmaxTokenStatus> => apiClient.delete(`/smax/${kind}-token`),

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
