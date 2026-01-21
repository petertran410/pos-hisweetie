import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  destructionsApi,
  type DestructionQueryParams,
} from "../api/destructions";
import { toast } from "sonner";

export function useDestructions(params?: DestructionQueryParams) {
  return useQuery({
    queryKey: ["destructions", params],
    queryFn: () => destructionsApi.getAll(params),
  });
}

export function useDestruction(id: number) {
  return useQuery({
    queryKey: ["destructions", id],
    queryFn: () => destructionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: destructionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      toast.success("Tạo phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu xuất hủy thất bại");
    },
  });
}

export function useUpdateDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      destructionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      toast.success("Cập nhật phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu xuất hủy thất bại");
    },
  });
}

export function useDeleteDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: destructionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      toast.success("Xóa phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa phiếu xuất hủy thất bại");
    },
  });
}

export function useCancelDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: any }) =>
      destructionsApi.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      toast.success("Hủy phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu xuất hủy thất bại");
    },
  });
}
