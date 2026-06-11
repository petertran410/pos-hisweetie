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

/** Bảng phẳng dòng sản phẩm của PĐN — trang "Đặt hàng nhập chi tiết". */
export function useOrderSupplierDetailItems(params?: OrderSupplierFilters) {
  return useQuery({
    queryKey: ["order-supplier-detail-items", params],
    queryFn: () => orderSuppliersApi.getDetailItems(params),
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

/**
 * Chốt hoàn thành PDN thủ công khi NCC không giao nốt phần còn thiếu.
 * Set status=3 + toComplete=true. Backend chặn nếu đã hủy/đã hoàn thành.
 */
export function useCompleteOrderSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => orderSuppliersApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      toast.success("Đã chốt hoàn thành phiếu đặt hàng nhập");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hoàn thành phiếu đặt hàng nhập");
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

/**
 * Tổng số "Đặt NCC" cho 1 batch productIds.
 * Chỉ tính các phiếu OrderSupplier ở trạng thái Đã xác nhận NCC hoặc Nhập một phần.
 * Truyền branchId nếu muốn lọc theo chi nhánh.
 *
 * Đối xứng `useOrdersPendingSummary` của phía bán.
 */
export function useOrderSuppliersConfirmedSummary(
  productIds: number[],
  branchId?: number
) {
  const sortedKey = [...productIds].sort((a, b) => a - b).join(",");
  return useQuery({
    queryKey: [
      "order-suppliers-confirmed-summary",
      sortedKey,
      branchId ?? null,
    ],
    queryFn: () =>
      orderSuppliersApi.getConfirmedSummary(productIds, branchId),
    enabled: productIds.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Danh sách phiếu đặt hàng nhập (Đã xác nhận NCC / Nhập một phần) chứa
 * sản phẩm cụ thể. Truyền branchId để lọc theo chi nhánh đang chọn.
 * Dùng cho modal khi click vào số "Đặt NCC".
 *
 * Đối xứng `useOrdersPendingByProduct` của phía bán.
 */
export function useOrderSuppliersConfirmedByProduct(
  productId: number | null,
  branchId?: number
) {
  return useQuery({
    queryKey: [
      "order-suppliers-confirmed-by-product",
      productId,
      branchId ?? null,
    ],
    queryFn: () =>
      orderSuppliersApi.getConfirmedByProduct(productId as number, branchId),
    enabled: !!productId,
  });
}
