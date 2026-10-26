"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store/auth";
import { endSession, refreshAccessToken } from "@/lib/auth/session";

const REVOKE_MESSAGES: Record<string, string> = {
  permission: "Quyền của bạn đã được thay đổi. Vui lòng đăng nhập lại.",
  password: "Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.",
  disabled: "Tài khoản đã bị vô hiệu hóa.",
  remote_logout: "Bạn đã bị đăng xuất khỏi thiết bị này.",
  reuse: "Phát hiện phiên đăng nhập bất thường. Vui lòng đăng nhập lại.",
  default: "Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.",
};

/** Gom các sự kiện đến dồn dập (vd ra hóa đơn hàng loạt) rồi mới refetch 1 lần. */
const INVALIDATE_DEBOUNCE_MS = 400;
/** Bị server từ chối/ngắt → thử lại sau 60s. */
const UNAUTHORIZED_RETRY_MS = 60_000;

const ORDER_QUERY_KEYS = [
  ["orders"],
  ["orders-totals"],
  ["orders-pending-summary"],
  ["orders-pending-by-product"],
] as const;

/**
 * URL socket = NEXT_PUBLIC_SOCKET_URL, hoặc origin của NEXT_PUBLIC_API_URL
 * (bỏ /api). API URL tương đối → dùng origin của trang.
 */
const resolveSocketUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (explicit) return explicit;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  try {
    return new URL(apiUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
};

/**
 * Lắng nghe sự kiện `order.changed` từ backend và làm mới dữ liệu đơn hàng,
 * để mọi máy/tab thấy trạng thái đơn mới ngay khi có người cập nhật.
 * Query đang hiển thị sẽ refetch; query ẩn chỉ bị đánh dấu stale.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const invalidateOrders = () => {
      for (const queryKey of ORDER_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
    };
    const scheduleInvalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        invalidateOrders();
      }, INVALIDATE_DEBOUNCE_MS);
    };

    const url = resolveSocketUrl();
    // Trang chạy HTTPS thì socket bắt buộc HTTPS/WSS — không gửi token qua kênh hở.
    if (window.location.protocol === "https:" && !url.startsWith("https://")) {
      console.warn("[realtime] Bỏ qua kết nối không mã hóa:", url);
      return;
    }

    // Token gửi trong gói handshake (auth), KHÔNG đặt trên URL/query.
    const socket: Socket = io(url, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 10_000,
    });

    // Server từ chối token (access token 15 phút vừa hết hạn...) → xin token
    // mới bằng refresh cookie; token đổi sẽ tạo kết nối mới (effect theo token).
    // Server chủ động ngắt (hết hạn/thu hồi) → socket.io KHÔNG tự thử lại.
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRetry = () => {
      if (retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (!socket.connected) socket.connect();
      }, UNAUTHORIZED_RETRY_MS);
    };

    socket.on("connect_error", (err) => {
      console.info("[realtime] Lỗi kết nối:", err.message);
      if (err.message === "unauthorized") {
        socket.disconnect();
        void refreshAccessToken().then((ok) => {
          if (!ok) scheduleRetry();
        });
      }
    });

    // Bị đổi quyền / đổi mật khẩu / khóa tài khoản → đăng xuất ngay.
    socket.on("auth.revoked", (payload: { reason?: string }) => {
      endSession(
        REVOKE_MESSAGES[payload?.reason ?? ""] ?? REVOKE_MESSAGES.default,
        "revoked",
      );
    });

    let hasConnected = false;
    socket.on("connect", () => {
      console.info("[realtime] Đã kết nối");
      // Kết nối lại (sau deploy/mất mạng/điện thoại ngủ) → bắt kịp thay đổi bị lỡ.
      if (hasConnected) scheduleInvalidate();
      hasConnected = true;
    });
    socket.on("disconnect", (reason) => {
      console.info("[realtime] Mất kết nối:", reason);
      if (reason === "io server disconnect") {
        void refreshAccessToken().then((ok) => {
          if (!ok) scheduleRetry();
        });
      }
    });
    socket.on("order.changed", scheduleInvalidate);

    // Điện thoại mở lại app/tab → kết nối lại ngay, không chờ backoff.
    const onVisible = () => {
      if (document.visibilityState === "visible" && !socket.connected) {
        socket.connect();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
      socket.off();
      socket.disconnect();
    };
  }, [token, queryClient]);
}

export function RealtimeSync() {
  useRealtimeSync();
  return null;
}
