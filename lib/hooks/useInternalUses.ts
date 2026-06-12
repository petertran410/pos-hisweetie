import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  internalUsesApi,
  type InternalUseQueryParams,
} from "../api/internalUses";
import { toast } from "sonner";

export function useInternalUses(params?: InternalUseQueryParams) {
  return useQuery({
    queryKey: ["internal-uses", params],
    queryFn: () => internalUsesApi.getAll(params),
  });
}

export function useInternalUse(id: number) {
  return useQuery({
    queryKey: ["internal-uses", id],
    queryFn: () => internalUsesApi.getById(id),
    enabled: !!id,
  });
}

export function useInternalUsePurposes() {
  return useQuery({
    queryKey: ["internal-use-purposes"],
    queryFn: () => internalUsesApi.getPurposes(),
  });
}

export function useCreatePurpose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; order?: number }) =>
      internalUsesApi.createPurpose(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-purposes"] });
      toast.success("Tạo mục đích sử dụng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo mục đích sử dụng thất bại");
    },
  });
}

export function useUpdatePurpose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; order?: number };
    }) => internalUsesApi.updatePurpose(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-purposes"] });
      toast.success("Cập nhật mục đích sử dụng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật mục đích sử dụng thất bại");
    },
  });
}

export function useDeletePurpose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => internalUsesApi.deletePurpose(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-purposes"] });
      toast.success("Xóa mục đích sử dụng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa mục đích sử dụng thất bại");
    },
  });
}

export function useCreateInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: internalUsesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      toast.success("Tạo phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu xuất dùng nội bộ thất bại");
    },
  });
}

export function useUpdateInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      internalUsesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      queryClient.invalidateQueries({
        queryKey: ["internal-uses", variables.id],
      });
      toast.success("Cập nhật phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu xuất dùng nội bộ thất bại");
    },
  });
}

export function useCompleteInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => internalUsesApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      queryClient.invalidateQueries({ queryKey: ["internal-uses", id] });
      toast.success("Hoàn thành phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hoàn thành phiếu thất bại");
    },
  });
}

export function useCancelInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: any }) =>
      internalUsesApi.cancel(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      queryClient.invalidateQueries({
        queryKey: ["internal-uses", variables.id],
      });
      toast.success("Hủy phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu xuất dùng nội bộ thất bại");
    },
  });
}
