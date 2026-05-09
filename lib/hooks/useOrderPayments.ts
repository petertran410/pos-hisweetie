import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderPaymentsApi, CreateOrderPaymentDto } from "../api/order-payments";
import { toast } from "sonner";
import { useSandboxStore } from "../store/sandbox";
import { useSandboxDataStore } from "../store/sandbox-data";

export function useOrderPayments(orderId: number) {
  return useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: () => orderPaymentsApi.getPaymentsByOrder(orderId),
    enabled: !!orderId,
  });
}

export function useCreateOrderPayment() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: (data: any) => {
      if (isSandbox) {
        // Cập nhật paidAmount trên order sandbox
        const orders = useSandboxDataStore.getState().getEntities("orders");
        const order = orders.find((o: any) => o.id === data.orderId);
        if (order) {
          const newPaid = Number(order.paidAmount || 0) + Number(data.amount);
          useSandboxDataStore.getState().updateEntity("orders", data.orderId, {
            paidAmount: newPaid,
            debtAmount: Number(order.grandTotal || 0) - newPaid,
            paymentStatus:
              newPaid >= Number(order.grandTotal) ? "Paid" : "Partial",
          });
        }
        return Promise.resolve({ id: Date.now(), ...data });
      }
      return orderPaymentsApi.createPayment(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-payments"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (!isSandbox) toast.success("Thêm thanh toán thành công");
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
