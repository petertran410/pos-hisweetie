import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionStagesApi } from "../api/production-stages";
import { toast } from "sonner";

export function useProductionStages(includeInactive = false) {
  return useQuery({
    queryKey: ["production-stages", includeInactive],
    queryFn: () => productionStagesApi.getAll(includeInactive),
    staleTime: 60_000,
  });
}

export function useCreateProductionStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productionStagesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages"] });
      toast.success("Đã thêm giai đoạn");
    },
    onError: (e: any) => toast.error(e.message || "Không thể thêm giai đoạn"),
  });
}

export function useUpdateProductionStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      productionStagesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages"] });
      toast.success("Đã cập nhật giai đoạn");
    },
    onError: (e: any) =>
      toast.error(e.message || "Không thể cập nhật giai đoạn"),
  });
}

export function useDeleteProductionStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productionStagesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-stages"] });
      toast.success("Đã xóa giai đoạn");
    },
    onError: (e: any) => toast.error(e.message || "Không thể xóa giai đoạn"),
  });
}
