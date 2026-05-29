import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderSuppliersApi } from "../api/order-suppliers";
import type { OrderSupplierFilters } from "../types/order-supplier";
import { toast } from "sonner";

export function useOrderSuppliers(params?: OrderSupplierFilters) {
  return useQuery({
    queryKey: ["order-suppliers", params],
    queryFn: () => orderSuppliersApi.getAll(params),
  });
}

export function useOrderSupplier(id: number) {
  return useQuery({
    queryKey: ["order-suppliers", id],
    queryFn: () => orderSuppliersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderSuppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      toast.success("Tạo phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu đặt hàng nhập thất bại");
    },
  });
}

export function useUpdateOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      orderSuppliersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({
        queryKey: ["order-suppliers", variables.id],
      });
      toast.success("Cập nhật phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu đặt hàng nhập thất bại");
    },
  });
}

export function useDeleteOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderSuppliersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      toast.success("Xóa phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa phiếu đặt hàng nhập thất bại");
    },
  });
}

/**
 * Hủy mềm PDN. Đối xứng `useCancelOrder` của phía bán.
 *   - cancelPayments=true → soft cancel toàn bộ payment + cashflow PCPDN
 *   - cancelPayments=false → throw nếu PDN còn payment active
 *
 * Backend block khi đã có PN active (chưa CANCELLED) — UX hiển thị toast lỗi.
 */
export function useCancelOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      cancelPayments,
    }: {
      id: number;
      cancelPayments: boolean;
    }) => orderSuppliersApi.cancel(id, cancelPayments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Hủy phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hủy phiếu đặt hàng nhập");
    },
  });
}

export function useOrderSupplierPayments(orderSupplierId: number) {
  return useQuery({
    queryKey: ["order-supplier-payments", orderSupplierId],
    queryFn: () => orderSuppliersApi.getPayments(orderSupplierId),
    enabled: !!orderSupplierId,
  });
}
