import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import type { ZaloContactKind } from "@/lib/types/smaxChat";

const contextKey = (customerId: number) => ["smaxChatContext", customerId];

export function useChatContext(customerId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: contextKey(customerId ?? 0),
    queryFn: () => smaxChatApi.getContext(customerId!),
    enabled: enabled && !!customerId,
    staleTime: 30_000,
    retry: false,
  });
}

export function useSaveZaloContact(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: ZaloContactKind; zaloId: string; name?: string; pagePid?: string }) =>
      smaxChatApi.createContact(customerId, body),
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: contextKey(customerId) });
      queryClient.invalidateQueries({ queryKey: ["smaxSharedGroups", customerId] });
      toast.success("Đã lưu ID Zalo");
      if (contact.linkedLead) {
        toast.success(`Đã gắn ${contact.linkedLead.code} (trùng ID Zalo) vào khách`);
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Lưu ID Zalo thất bại"),
  });
}

export function useDeleteZaloContact(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: number) => smaxChatApi.deleteContact(customerId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextKey(customerId) });
      queryClient.invalidateQueries({ queryKey: ["smaxSharedGroups", customerId] });
      toast.success("Đã xóa ID Zalo");
    },
    onError: (e: Error) => toast.error(e.message || "Xóa thất bại"),
  });
}

/** Nhóm Zalo chung giữa kênh của tôi và khách — chỉ quét khi người dùng bấm. */
export function useSharedGroups(customerId: number, pagePid: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["smaxSharedGroups", customerId, pagePid],
    queryFn: () => smaxChatApi.scanSharedGroups(customerId, pagePid!),
    enabled: enabled && !!pagePid,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Hội thoại mới nhất trên kênh Zalo của tôi (backend cache 10s). */
// limit: số hội thoại gần nhất (mặc định 30; thanh thu gọn xin thêm khi bấm "…")
export function useRecentChats(enabled: boolean, pagePid?: string | null, limit = 30, q?: string) {
  return useQuery({
    queryKey: recentChatsKey(pagePid, limit, q),
    queryFn: () => smaxChatApi.getRecent(pagePid ?? undefined, limit, q || undefined),
    // Đổi limit: giữ danh sách cũ trong lúc tải thêm (không nháy trống)
    placeholderData: (prev) => prev,
    enabled,
    staleTime: 10_000,
    // Danh sách: 15s/lần để tin mới lên nhanh; kết quả tìm kiếm ít đổi → 60s
    refetchInterval: q ? 60_000 : 15_000,
    refetchIntervalInBackground: false,
    // Quay lại tab: tải ngay thay vì đợi lượt kế
    refetchOnWindowFocus: true,
    retry: false,
  });
}

const recentChatsKey = (pagePid?: string | null, limit = 30, q?: string) => ["smaxRecentChats", pagePid ?? null, limit, q ?? ""];

/** Nút ⟳: lấy mới thật từ Smax (bỏ qua cache của backend) rồi cập nhật danh sách. */
export function useRefreshRecentChats(pagePid?: string | null, limit = 30, q?: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient
      .fetchQuery({
        queryKey: recentChatsKey(pagePid, limit, q),
        queryFn: () => smaxChatApi.getRecent(pagePid ?? undefined, limit, q || undefined, true),
        staleTime: 0,
      })
      .catch(() => undefined); // lỗi đã báo qua toast chung của QueryCache
}

/** Avatar, tên Zalo và trạng thái kết bạn của hội thoại đang mở. */
export function useZaloProfile(customerId: number, pagePid: string | undefined, contactId: number) {
  return useQuery({
    queryKey: ["smaxZaloProfile", customerId, pagePid, contactId],
    queryFn: () => smaxChatApi.getZaloProfile(customerId, pagePid!, contactId),
    enabled: !!pagePid,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

/** Kênh Zalo đã liên kết với tài khoản đang đăng nhập (kèm avatar, tình trạng). */
export function useMyChannels(enabled: boolean) {
  return useQuery({
    queryKey: ["smaxMyChannels"],
    queryFn: () => smaxChatApi.getChannels(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
