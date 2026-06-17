import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trademarksApi } from "@/lib/api/trademarks";

export const useTrademarks = (options?: { silentForbidden?: boolean }) => {
  return useQuery({
    queryKey: ["trademarks"],
    queryFn: trademarksApi.getTrademarks,
    ...(options?.silentForbidden
      ? { meta: { silentForbidden: true } }
      : {}),
  });
};

export const useCreateTrademark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trademarksApi.createTrademark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trademarks"] });
      toast.success("Tạo thương hiệu thành công");
    },
  });
};

export const useUpdateTrademark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      trademarksApi.updateTrademark(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trademarks"] });
      toast.success("Cập nhật thương hiệu thành công");
    },
  });
};
