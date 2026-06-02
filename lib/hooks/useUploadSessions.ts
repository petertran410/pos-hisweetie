import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { API_URL } from "../config/api";

export type UploadSubfolder = "bao-don" | "dong-hang" | "loading" | "bao-don/chi-phi";

export interface UploadSession {
  id: string;
  token: string;
  uploadUrl: string;
  maxFiles: number;
  expiresAt: string;
}

export interface UploadSessionStatus {
  id: string;
  status: "active" | "closed" | "expired";
  images: string[];
  maxFiles: number;
  expiresAt: string;
}

/** Tạo phiên upload mới trên backend, trả về uploadUrl để encode QR. */
export async function createUploadSession(
  subfolder: UploadSubfolder,
  maxFiles?: number
): Promise<UploadSession> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_URL}/upload-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subfolder, maxFiles }),
  });
  if (!res.ok) throw new Error("Không tạo được phiên upload");
  return res.json();
}

/** Đóng phiên upload (gọi khi đóng modal). */
export async function closeUploadSession(id: string): Promise<void> {
  const token = useAuthStore.getState().token;
  try {
    await fetch(`${API_URL}/upload-sessions/${id}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // bỏ qua lỗi đóng phiên
  }
}

/** Poll trạng thái phiên mỗi 2s để lấy ảnh điện thoại vừa upload. */
export function useUploadSessionPoll(
  id: string | null,
  enabled: boolean
) {
  return useQuery<UploadSessionStatus>({
    queryKey: ["upload-session", id],
    queryFn: async () => {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${API_URL}/upload-sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không lấy được trạng thái phiên");
      return res.json();
    },
    enabled: enabled && !!id,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });
}
