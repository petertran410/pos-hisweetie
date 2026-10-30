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
      toast.success(`Đã đồng bộ ${onSmax} kênh Zalo từ Smax`, {
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
