import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { smaxApi, type SmaxTokenKind } from "@/lib/api/smax";
import { toast } from "sonner";

const KEY = ["smaxZaloChannels"];

export function useSmaxZaloChannels() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => smaxApi.getZaloChannels(),
    retry: false,
  });
}

export function useSyncSmaxChannels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => smaxApi.syncChannels(),
    onSuccess: ({ channels, updated }) => {
      queryClient.setQueryData(KEY, channels);
      // Khung chat Zalo dùng tên kênh đã lưu
      queryClient.invalidateQueries({ queryKey: ["smaxMyChannels"] });
      const onSmax = channels.filter((c) => !c.missing).length;
      const missing = channels.length - onSmax;
      toast.success(`Đã đồng bộ ${onSmax} kênh từ Smax`, {
        description:
          [updated && `Cập nhật tên ${updated} kênh`, missing && `${missing} kênh không còn trên Smax`]
            .filter(Boolean)
            .join(" · ") || undefined,
      });
    },
    onError: (e: Error) => toast.error(e.message || "Đồng bộ thất bại"),
  });
}

export function useLinkSmaxChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pagePid, userId }: { pagePid: string; userId: number }) =>
      smaxApi.linkChannel(pagePid, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Đã thêm người dùng vào kênh Zalo");
    },
    onError: (e: any) => toast.error(e.message || "Liên kết thất bại"),
  });
}

export function useUnlinkSmaxChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pagePid, userId }: { pagePid: string; userId?: number }) =>
      smaxApi.unlinkChannel(pagePid, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success("Đã gỡ liên kết");
    },
    onError: (e: any) => toast.error(e.message || "Gỡ thất bại"),
  });
}

const tokenKey = (kind: SmaxTokenKind) => ["smaxToken", kind];

/** Tình trạng token Smax (backend thử token với Smax mỗi lần tải). */
export function useSmaxToken(kind: SmaxTokenKind) {
  return useQuery({
    queryKey: tokenKey(kind),
    queryFn: () => smaxApi.getToken(kind),
    retry: false,
    staleTime: 0,
  });
}

// Token đổi → dữ liệu Smax đang hiện tải lại (khung chat, kênh, Thư viện…)
const refreshTokenFeatures = (queryClient: ReturnType<typeof useQueryClient>) => {
  for (const key of [
    "smaxThreadMessages",
    "smaxZaloProfile",
    "smaxLibraryAlbums",
    "smaxLibraryFiles",
    "smaxRecentChats",
    "smaxMyChannels",
    "smaxChatContext",
    "smaxZaloChannels",
  ])
    queryClient.invalidateQueries({ queryKey: [key] });
};

export function useSaveSmaxToken(kind: SmaxTokenKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => smaxApi.setToken(kind, token),
    onSuccess: (status) => {
      queryClient.setQueryData(tokenKey(kind), status);
      refreshTokenFeatures(queryClient);
      toast.success("Đã lưu token — có hiệu lực ngay", status.warning ? { description: status.warning } : undefined);
    },
    onError: (e: Error) => toast.error(e.message || "Lưu token thất bại"),
  });
}

export function useClearSmaxToken(kind: SmaxTokenKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => smaxApi.clearToken(kind),
    onSuccess: (status) => {
      queryClient.setQueryData(tokenKey(kind), status);
      refreshTokenFeatures(queryClient);
      toast.success(status.source === "env" ? "Đã xoá — đang dùng token trong .env" : "Đã xoá token");
    },
    onError: (e: Error) => toast.error(e.message || "Xoá token thất bại"),
  });
}
