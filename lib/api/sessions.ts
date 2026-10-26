import { apiClient } from "@/lib/config/api";

export interface DeviceSession {
  id: number;
  browser: string;
  os: string;
  deviceType: "mobile" | "tablet" | "desktop";
  /** IP gần đúng — chỉ để tham khảo. */
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  /** Thiết bị đang dùng để xem trang này. */
  current: boolean;
}

export const sessionsApi = {
  listMine: () => apiClient.get<DeviceSession[]>("/auth/sessions"),
  revokeMine: (id: number) => apiClient.delete(`/auth/sessions/${id}`),
  revokeOthers: () =>
    apiClient.post<{ ok: boolean; count: number }>(
      "/auth/sessions/revoke-others",
    ),

  listOfUser: (userId: number) =>
    apiClient.get<DeviceSession[]>(`/users/${userId}/sessions`),
  revokeOfUser: (userId: number, sessionId: number) =>
    apiClient.delete(`/users/${userId}/sessions/${sessionId}`),
  revokeAllOfUser: (userId: number) =>
    apiClient.post<{ ok: boolean; count: number }>(
      `/users/${userId}/sessions/revoke-all`,
    ),
};
