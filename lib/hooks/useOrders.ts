import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { toast } from "sonner";

export function useOrders(params?: any) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => ordersApi.getOrders(params),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
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
      toast.success("Cập nhật đơn hàng thành công");
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
