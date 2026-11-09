import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { smaxApi } from "@/lib/api/smax";
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

const TOKEN_KEY = ["smaxUserToken"];

/** Tình trạng token đăng nhập Smax (backend thử token với Smax mỗi lần tải). */
export function useSmaxUserToken() {
  return useQuery({
    queryKey: TOKEN_KEY,
    queryFn: () => smaxApi.getUserToken(),
    retry: false,
    staleTime: 0,
  });
}

// Token đổi → các tính năng chat dùng token (thả cảm xúc, thu hồi, đổi tên, Thư viện…) tải lại
const refreshTokenFeatures = (queryClient: ReturnType<typeof useQueryClient>) => {
  for (const key of ["smaxThreadMessages", "smaxZaloProfile", "smaxLibraryAlbums", "smaxLibraryFiles", "smaxRecentChats"])
    queryClient.invalidateQueries({ queryKey: [key] });
};

export function useSaveSmaxUserToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => smaxApi.setUserToken(token),
    onSuccess: (status) => {
      queryClient.setQueryData(TOKEN_KEY, status);
      refreshTokenFeatures(queryClient);
      toast.success("Đã lưu token đăng nhập Smax — có hiệu lực ngay");
    },
    onError: (e: Error) => toast.error(e.message || "Lưu token thất bại"),
  });
}

export function useClearSmaxUserToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => smaxApi.clearUserToken(),
    onSuccess: (status) => {
      queryClient.setQueryData(TOKEN_KEY, status);
      refreshTokenFeatures(queryClient);
      toast.success(status.source === "env" ? "Đã xoá — đang dùng token trong .env" : "Đã xoá token đăng nhập Smax");
    },
    onError: (e: Error) => toast.error(e.message || "Xoá token thất bại"),
  });
}
