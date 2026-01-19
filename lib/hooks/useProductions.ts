import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  productionsApi,
  type ProductionQueryParams,
  type CreateProductionData,
} from "../api/productions";
import { toast } from "sonner";

export function useProductions(params?: ProductionQueryParams) {
  return useQuery({
    queryKey: ["productions", params],
    queryFn: () => productionsApi.getAll(params),
  });
}

export function useProduction(id: number) {
  return useQuery({
    queryKey: ["productions", id],
    queryFn: () => productionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductionData) => productionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      toast.success("Tạo phiếu sản xuất thành công");
    },
    onError: () => {
      toast.error("Không thể tạo phiếu sản xuất");
    },
  });
}

export function useUpdateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateProductionData>;
    }) => productionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      toast.success("Cập nhật phiếu sản xuất thành công");
    },
    onError: () => {
      toast.error("Không thể cập nhật phiếu sản xuất");
    },
  });
}

export function useDeleteProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      toast.success("Xóa phiếu sản xuất thành công");
    },
    onError: () => {
      toast.error("Không thể xóa phiếu sản xuất");
    },
  });
}
