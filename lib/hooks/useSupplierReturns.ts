import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierReturnsApi } from "@/lib/api/supplier-returns";
import type { SupplierReturnFilters } from "@/lib/types/supplier-return";
import { toast } from "sonner";

export function useSupplierReturns(params?: SupplierReturnFilters) {
  return useQuery({
    queryKey: ["supplier-returns", params],
    queryFn: () => supplierReturnsApi.getAll(params),
  });
}

export function useSupplierReturn(id: number) {
  return useQuery({
    queryKey: ["supplier-returns", id],
    queryFn: () => supplierReturnsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSupplierReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supplierReturnsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      toast.success("Tạo phiếu trả hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu trả hàng nhập thất bại");
    },
  });
}

export function useConfirmExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      supplierReturnsApi.confirmExport(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      if (variables.data.isDraft) {
        toast.success("Lưu tạm thành công");
      } else {
        toast.success("Xác nhận xuất kho thành công");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận xuất kho thất bại");
    },
  });
}

export function useConfirmSupplierRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      supplierReturnsApi.confirmRefund(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      toast.success("Xác nhận hoàn thành phiếu trả hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận thất bại");
    },
  });
}

export function useCancelSupplierReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supplierReturnsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      toast.success("Hủy phiếu trả hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu thất bại");
    },
  });
}

export function useUpdateSupplierReturnStep1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      supplierReturnsApi.updateStep1(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      if (variables.data.isDraft) {
        toast.success("Lưu tạm thành công");
      } else {
        toast.success("Cập nhật phiếu trả hàng nhập thành công");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật thất bại");
    },
  });
}

export function useImportSupplierReturns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supplierReturnsApi.importFromExcel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      if (data.failed === 0) {
        toast.success(`Import ${data.imported} phiếu thành công`);
      } else {
        toast.warning(
          `Import hoàn tất: ${data.imported} thành công, ${data.failed} lỗi`
        );
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Import thất bại");
    },
  });
}
