import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { toast } from "sonner";
import { useSandboxStore } from "../store/sandbox";
import { useSandboxDataStore } from "../store/sandbox-data";
import { sandboxQuery } from "../utils/sandbox-filters";

export function useOrders(params?: any) {
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useQuery({
    queryKey: ["orders", params, isSandbox],
    queryFn: () => {
      if (isSandbox) {
        const items = useSandboxDataStore.getState().getEntities("orders");
        return sandboxQuery(items, params);
      }
      return ordersApi.getOrders(params);
    },
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
  type?: "order" | "invoice"
) {
  return useQuery({
    queryKey: ["product-price-history", customerId, productId, type],
    queryFn: () =>
      ordersApi.getProductPriceHistory(customerId!, productId!, type),
    enabled: !!customerId && !!productId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: (data: any) => {
      if (isSandbox) {
        const newOrder = useSandboxDataStore.getState().addEntity("orders", {
          ...data,
          status: 1,
          statusValue: "Phiếu tạm",
          orderStatus: "pending",
          paymentStatus: "Draft",
          totalAmount: data.grandTotal || 0,
          paidAmount: 0,
          debtAmount: data.grandTotal || 0,
          depositAmount: 0,
          customer: data._customer || null,
          branch: data._branch || null,
          soldBy: data._soldBy || null,
          creator: data._creator || null,
          items: data.items || [],
          payments: [],
        });
        return Promise.resolve(newOrder);
      }
      return ordersApi.createOrder(data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (!isSandbox && data.warnings?.length > 0) {
        toast.warning("Đơn hàng đã tạo nhưng có cảnh báo", {
          description: data.warnings.map((w: any) => w.message).join(", "),
        });
      } else {
        toast.success(
          isSandbox
            ? "Tạo đơn hàng sandbox thành công"
            : "Tạo đơn hàng thành công"
        );
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo đơn hàng thất bại");
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      if (isSandbox) {
        useSandboxDataStore.getState().updateEntity("orders", id, data);
        return Promise.resolve(data);
      }
      return ordersApi.updateOrder(id, data);
    },
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
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: ({
      id,
      cancelPayments,
    }: {
      id: number;
      cancelPayments: boolean;
    }) => {
      if (isSandbox) {
        useSandboxDataStore.getState().updateEntity("orders", id, {
          status: 4,
          statusValue: "Đã hủy",
          orderStatus: "cancelled",
        });
        return Promise.resolve({});
      }
      return ordersApi.cancel(id, cancelPayments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Hủy đơn hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hủy đơn hàng");
    },
  });
}
