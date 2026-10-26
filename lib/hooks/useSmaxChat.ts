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

/** Trang tin mới nhất, poll 5s khi sidebar mở và tab đang hiển thị. */
export function useChatMessages(
  customerId: number | undefined,
  pagePid: string | undefined,
  contactId: number | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["smaxChatMessages", customerId, pagePid, contactId],
    queryFn: () =>
      smaxChatApi.getMessages(customerId!, { pagePid: pagePid!, contactId: contactId! }),
    enabled: enabled && !!customerId && !!pagePid && !!contactId,
    // Dừng poll khi lỗi: v5 đưa query chưa có data về pending mỗi lần fetch →
    // kẹt skeleton + toast lỗi lặp lại. Người dùng bấm "Thử lại" để tải lại.
    refetchInterval: (query) => (query.state.status === "error" ? false : 5_000),
    refetchIntervalInBackground: false,
    retry: false,
  });
}

export function useSendChatMessage(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof smaxChatApi.send>[1]) =>
      smaxChatApi.send(customerId, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["smaxChatMessages", customerId, vars.pagePid, vars.contactId],
      });
    },
  });
}

export function useSaveZaloContact(customerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: ZaloContactKind; zaloId: string; name?: string }) =>
      smaxChatApi.createContact(customerId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextKey(customerId) });
      queryClient.invalidateQueries({ queryKey: ["smaxSharedGroups", customerId] });
      toast.success("Đã lưu ID Zalo");
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

/** Hội thoại mới nhất trên kênh Zalo của tôi (backend cache 30s). */
export function useRecentChats(enabled: boolean, pagePid?: string | null) {
  return useQuery({
    queryKey: ["smaxRecentChats", pagePid ?? null],
    queryFn: () => smaxChatApi.getRecent(pagePid ?? undefined),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
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
