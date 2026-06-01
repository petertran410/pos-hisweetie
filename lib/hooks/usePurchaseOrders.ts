import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseOrdersApi } from "../api/purchase-orders";
import type { PurchaseOrderFilters } from "../types/purchase-order";
import { toast } from "sonner";

export function usePurchaseOrders(params?: PurchaseOrderFilters) {
  return useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: () => purchaseOrdersApi.getAll(params),
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => purchaseOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Tạo phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu nhập hàng thất bại");
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", variables.id],
      });
      toast.success("Cập nhật phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu nhập hàng thất bại");
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Xóa phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa phiếu nhập hàng thất bại");
    },
  });
}

export function useCreatePurchaseOrderFromOrderSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderSupplierId,
      ...payload
    }: {
      orderSupplierId: number;
      additionalPayment?: number;
      items?: any[];
      payments?: Array<{ method: string; amount: number; accountId?: number }>;
      branchId?: number;
      purchaseDate?: string;
      discount?: number;
      discountRatio?: number;
      isDraft?: boolean;
      partnerType?: string;
      description?: string;
      purchaseById?: number;
    }) =>
      purchaseOrdersApi.createFromOrderSupplier(orderSupplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Tạo phiếu nhập từ đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu nhập từ đặt hàng nhập thất bại");
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cancelPayments,
    }: {
      id: number;
      cancelPayments?: boolean;
    }) => purchaseOrdersApi.cancel(id, { cancelPayments }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Hủy phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu nhập hàng thất bại");
    },
  });
}
