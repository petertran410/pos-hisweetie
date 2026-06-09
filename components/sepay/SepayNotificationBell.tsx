"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import {
  useUnreadCount,
  useNotificationList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/hooks/useNotifications";
import type { AppNotification } from "@/lib/api/notifications";
import { formatCurrency } from "@/lib/utils";

/** "x phút trước" gọn nhẹ. */
function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

/**
 * Chuông thông báo (lưu ở server, đồng bộ đa thiết bị).
 * - Badge = số chưa đọc, poll 5s qua useUnreadCount.
 * - Click chuông → dropdown ngay dưới icon, list phân trang + "tải thêm".
 * - Click 1 thông báo → markRead + điều hướng tới link (đúng giao dịch).
 */
export function SepayNotificationBell() {
  const router = useRouter();
  const canView = usePermission("sepay", "view");
  const { isAuthenticated, isProfileSynced } = useAuthStore();
  const enabled = canView && isAuthenticated && isProfileSynced;

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useUnreadCount(enabled);
  const {
    data: listData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotificationList(enabled && open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Đóng dropdown khi click ra ngoài.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!enabled) return null;

  const unread = unreadData?.count ?? 0;
  const badge = unread > 99 ? "99+" : String(unread);
  const notifications = listData?.pages.flatMap((p) => p.data) ?? [];

  const handleOpenNotification = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 hover:bg-gray-400 rounded transition-colors"
        aria-label="Thông báo">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white text-gray-800 rounded-lg shadow-2xl border z-50 flex flex-col max-h-[26rem]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-sm font-semibold">Thông báo</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50">
                <Check className="w-3.5 h-3.5" />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin inline" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                Chưa có thông báo
              </div>
            ) : (
              <>
                <ul className="divide-y">
                  {notifications.map((n) => {
                    const amount = n.data?.amountIn
                      ? `+${formatCurrency(Number(n.data.amountIn))}đ`
                      : null;
                    return (
                      <li
                        key={n.id}
                        className={n.readAt ? "" : "bg-blue-50/60"}>
                        <button
                          type="button"
                          onClick={() => handleOpenNotification(n)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            {!n.readAt && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {n.title}
                            </span>
                            <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          {amount && (
                            <p className="mt-0.5 text-sm font-semibold text-green-600">
                              {amount}
                            </p>
                          )}
                          {n.body && (
                            <p className="mt-0.5 text-xs text-gray-600 truncate">
                              {n.body}
                            </p>
                          )}
                          {n.data?.transactionContent && (
                            <p className="mt-0.5 text-xs text-gray-400 truncate">
                              {n.data.transactionContent}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {hasNextPage && (
                  <div className="px-4 py-2.5 border-t">
                    <button
                      type="button"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50">
                      {isFetchingNextPage ? "Đang tải..." : "Tải thêm"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
