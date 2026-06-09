import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications";

const UNREAD_POLL_INTERVAL = 5000; // 5s

/** Badge: số thông báo chưa đọc, poll 5s. */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
    refetchInterval: UNREAD_POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/** Danh sách thông báo phân trang (chỉ fetch khi mở dropdown). */
export function useNotificationList(enabled = false) {
  return useInfiniteQuery({
    queryKey: ["notifications-list"],
    queryFn: ({ pageParam }) =>
      notificationsApi.list({ cursor: pageParam ?? undefined, limit: 20 }),
    enabled,
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchOnWindowFocus: false,
  });
}

/** Đánh dấu 1 thông báo đã đọc → cập nhật badge + danh sách. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });
}

/** Đánh dấu tất cả đã đọc. */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      qc.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });
}
