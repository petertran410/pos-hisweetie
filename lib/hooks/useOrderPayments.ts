import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderPaymentsApi, CreateOrderPaymentDto } from "../api/order-payments";
import { toast } from "sonner";

export function useOrderPayments(orderId: number) {
  return useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: () => orderPaymentsApi.getPaymentsByOrder(orderId),
    enabled: !!orderId,
  });
}

export function useCreateOrderPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderPaymentsApi.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-payments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Thêm thanh toán thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể thêm thanh toán");
    },
  });
}

export function useDeleteOrderPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderPaymentsApi.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-payments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Xóa thanh toán thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể xóa thanh toán");
    },
  });
}
