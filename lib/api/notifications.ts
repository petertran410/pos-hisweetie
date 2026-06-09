import { apiClient } from "@/lib/config/api";

export interface NotificationData {
  txId?: number;
  sepayId?: string;
  amountIn?: string;
  accountNumber?: string | null;
  bankBrandName?: string | null;
  referenceNumber?: string | null;
  transactionContent?: string | null;
  [key: string]: unknown;
}

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: NotificationData | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: AppNotification[];
  nextCursor: number | null;
  unreadCount: number;
}

export const notificationsApi = {
  /** Danh sách thông báo, phân trang cursor (id giảm dần). */
  list: (params?: {
    cursor?: number;
    limit?: number;
  }): Promise<NotificationListResponse> => {
    return apiClient.get(`/notifications`, params);
  },
  /** Số thông báo chưa đọc (badge). */
  unreadCount: (): Promise<{ count: number }> => {
    return apiClient.get(`/notifications/unread-count`);
  },
  /** Đánh dấu 1 thông báo đã đọc. */
  markRead: (id: number): Promise<{ success: boolean }> => {
    return apiClient.patch(`/notifications/${id}/read`);
  },
  /** Đánh dấu tất cả đã đọc. */
  markAllRead: (): Promise<{ success: boolean; count: number }> => {
    return apiClient.post(`/notifications/read-all`);
  },
};
