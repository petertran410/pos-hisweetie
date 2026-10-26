"use client";

import { useAuthStore } from "@/lib/store/auth";

/**
 * Quản lý phiên đăng nhập phía trình duyệt.
 *
 * - Access token (15 phút) CHỈ nằm trong bộ nhớ (zustand không persist).
 * - Refresh token nằm trong cookie HttpOnly do backend set (JS không đọc được),
 *   chỉ gửi tới /api/auth/*. Mỗi lần làm mới, backend cấp refresh token mới.
 *
 * File này cố ý không import lib/config/api.ts để tránh vòng import.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const REFRESH_LOCK = "hs-auth-refresh";
const AUTH_CHANNEL = "hs-auth";
/** Làm mới trước khi hết hạn khoảng này. */
const REFRESH_AHEAD_MS = 60_000;

let inflight: Promise<boolean> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let channel: BroadcastChannel | null = null;

type SessionEndReason = "logout" | "revoked" | "expired";

const getChannel = () => {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  channel ??= new BroadcastChannel(AUTH_CHANNEL);
  return channel;
};

/** Lưu access token mới vào bộ nhớ + hẹn giờ làm mới chủ động. */
export function applyAccessToken(accessToken: string, expiresIn: number) {
  const expiresAt = Date.now() + expiresIn * 1000;
  useAuthStore.getState().setAccessToken(accessToken, expiresAt);
  scheduleRefresh(expiresAt);
}

function scheduleRefresh(expiresAt: number) {
  if (refreshTimer) clearTimeout(refreshTimer);
  const delay = Math.max(5_000, expiresAt - Date.now() - REFRESH_AHEAD_MS);
  refreshTimer = setTimeout(() => {
    void refreshAccessToken();
  }, delay);
}

/**
 * Kết thúc phiên ở tab này (và báo các tab khác), chuyển về trang đăng nhập.
 */
export function endSession(
  message?: string,
  reason: SessionEndReason = "expired",
) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  useAuthStore.getState().clearAuth();
  if (typeof window === "undefined") return;
  if (message) sessionStorage.setItem("auth-error", message);
  getChannel()?.postMessage({ type: "logout", reason, message });
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

/**
 * Xin access token mới bằng refresh token (cookie). Chỉ 1 request cùng lúc
 * trong tab và giữa các tab (Web Locks). Trả true nếu thành công.
 * Lỗi mạng → false nhưng KHÔNG đăng xuất (thử lại sau).
 */
export function refreshAccessToken(): Promise<boolean> {
  if (inflight) return inflight;

  const run = async (): Promise<boolean> => {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Mạng chập chờn: thử lại sau 15s.
      scheduleRefresh(Date.now() + REFRESH_AHEAD_MS + 15_000);
      return false;
    }

    if (res.ok) {
      const data = (await res.json()) as {
        accessToken: string;
        expiresIn: number;
      };
      applyAccessToken(data.accessToken, data.expiresIn);
      return true;
    }

    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body?.message === "string"
          ? body.message
          : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      endSession(message, "expired");
      return false;
    }

    // 5xx: giữ phiên, thử lại sau.
    scheduleRefresh(Date.now() + REFRESH_AHEAD_MS + 15_000);
    return false;
  };

  inflight = (async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.locks?.request) {
        return await navigator.locks.request(REFRESH_LOCK, run);
      }
      return await run();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Gọi khi mở trang: đảm bảo có access token trong bộ nhớ.
 * Trả true nếu đã có phiên hợp lệ.
 */
let ensuring: Promise<boolean> | null = null;

export function ensureAccessToken(): Promise<boolean> {
  if (ensuring) return ensuring;
  ensuring = (async () => {
    const { token, tokenExpiresAt } = useAuthStore.getState();
    if (token && tokenExpiresAt && tokenExpiresAt - Date.now() > 5_000) {
      return true;
    }
    return refreshAccessToken();
  })().finally(() => {
    ensuring = null;
  });
  return ensuring;
}

/** Đăng xuất: thu hồi refresh token phía server rồi xóa phiên ở mọi tab. */
export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // vẫn xóa phiên phía trình duyệt
  }
  endSession(undefined, "logout");
}

let listenersInstalled = false;

/** Đồng bộ giữa các tab + làm mới khi tab/điện thoại mở lại. Gọi 1 lần. */
export function installSessionListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;

  getChannel()?.addEventListener("message", (event: MessageEvent) => {
    if (event.data?.type !== "logout") return;
    if (refreshTimer) clearTimeout(refreshTimer);
    useAuthStore.getState().clearAuth();
    if (event.data.message) {
      sessionStorage.setItem("auth-error", event.data.message);
    }
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const { isAuthenticated, tokenExpiresAt } = useAuthStore.getState();
    if (!isAuthenticated) return;
    if (!tokenExpiresAt || tokenExpiresAt - Date.now() < REFRESH_AHEAD_MS) {
      void refreshAccessToken();
    }
  });
}
