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
