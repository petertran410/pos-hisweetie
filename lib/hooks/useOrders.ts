import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { toast } from "sonner";

export function useOrders(params?: any) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => ordersApi.getOrders(params),
  });
}

/**
 * Tổng các cột tiền của TOÀN BỘ đơn match filter (không phân trang).
 * Dùng cho hàng "tổng" hiển thị ngay dưới header bảng đặt hàng.
 */
export function useOrdersTotals(params?: any) {
  return useQuery({
    queryKey: ["orders-totals", params],
    queryFn: () => ordersApi.getTotals(params),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });
}

export function useProductPriceHistory(
  customerId?: number,
  productId?: number,
  type?: "order" | "invoice",
  branchId?: number
) {
  return useQuery({
    queryKey: ["product-price-history", customerId, productId, type, branchId ?? null],
    queryFn: () =>
      ordersApi.getProductPriceHistory(customerId!, productId!, type, branchId),
    enabled: !!customerId && !!productId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.createOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data.warnings && data.warnings.length > 0) {
        toast.warning("Đơn hàng đã tạo nhưng có cảnh báo", {
          description: data.warnings.map((w) => w.message).join(", "),
        });
      } else {
        toast.success("Tạo đơn hàng thành công");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo đơn hàng thất bại");
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      ordersApi.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật đơn hàng thất bại");
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Xóa đơn hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa đơn hàng thất bại");
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      cancelPayments,
    }: {
      id: number;
      cancelPayments: boolean;
    }) => ordersApi.cancel(id, cancelPayments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Hủy đơn hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hủy đơn hàng");
    },
  });
}

/**
 * Tổng số "Khách đặt" cho 1 batch productIds.
 * Chỉ tính các đơn ở trạng thái Phiếu tạm hoặc Đã xác nhận, mọi chi nhánh.
 */
export function useOrdersPendingSummary(productIds: number[]) {
  const sortedKey = [...productIds].sort((a, b) => a - b).join(",");
  return useQuery({
    queryKey: ["orders-pending-summary", sortedKey],
    queryFn: () => ordersApi.getPendingSummary(productIds),
    enabled: productIds.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Danh sách đơn hàng (Phiếu tạm/Đã xác nhận) chứa sản phẩm cụ thể.
 * Truyền branchId để lọc theo chi nhánh đang chọn ở DashboardHeader.
 * Dùng cho modal khi click vào số "Khách đặt".
 */
export function useOrdersPendingByProduct(
  productId: number | null,
  branchId?: number
) {
  return useQuery({
    queryKey: ["orders-pending-by-product", productId, branchId ?? null],
    queryFn: () =>
      ordersApi.getPendingByProduct(productId as number, branchId),
    enabled: !!productId,
  });
}
