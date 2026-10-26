"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/store/auth";

/** Gom các sự kiện đến dồn dập (vd ra hóa đơn hàng loạt) rồi mới refetch 1 lần. */
const INVALIDATE_DEBOUNCE_MS = 400;

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

    // Server từ chối token (hết hạn/bị khóa/đổi quyền) → dừng thử lại;
    // token mới sau khi đăng nhập lại sẽ tạo kết nối mới.
    socket.on("connect_error", (err) => {
      if (err.message === "unauthorized") socket.disconnect();
    });

    let hasConnected = false;
    socket.on("connect", () => {
      // Kết nối lại (sau deploy/mất mạng) → bắt kịp thay đổi bị lỡ.
      if (hasConnected) scheduleInvalidate();
      hasConnected = true;
    });
    socket.on("order.changed", scheduleInvalidate);

    return () => {
      if (timer) clearTimeout(timer);
      socket.off();
      socket.disconnect();
    };
  }, [token, queryClient]);
}

export function RealtimeSync() {
  useRealtimeSync();
  return null;
}
