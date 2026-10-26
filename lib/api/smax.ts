import { apiClient } from "@/lib/config/api";

export interface SmaxZaloChannel {
  pagePid: string;
  name: string;
  platform: "zalo" | "zaloweb" | string;
  active: boolean;
  // Mất kết nối Zalo (token lỗi) — Smax vẫn để active=true
  connectionError: { at: string; note: string | null } | null;
  // Đã liên kết nhưng kênh không còn trên Smax
  missing: boolean;
  // 1 kênh gắn được nhiều người dùng POS
  users: { id: number; name: string; email: string; phone?: string | null }[];
}

export const smaxApi = {
  getZaloChannels: (): Promise<SmaxZaloChannel[]> =>
    apiClient.get("/smax/zalo-channels"),

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
