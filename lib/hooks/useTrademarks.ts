import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trademarksApi } from "@/lib/api/trademarks";

export const useTrademarks = () => {
  return useQuery({
    queryKey: ["trademarks"],
    queryFn: trademarksApi.getTrademarks,
  });
};

export const useCreateTrademark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trademarksApi.createTrademark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trademarks"] });
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
    },
  });
};
