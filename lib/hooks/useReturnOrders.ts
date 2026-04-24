import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { returnOrdersApi } from "../api/return-orders";
import { toast } from "sonner";

export function useReturnOrders(params?: any) {
  return useQuery({
    queryKey: ["return-orders", params],
    queryFn: () => returnOrdersApi.getAll(params),
  });
}

export function useReturnOrder(id: number) {
  return useQuery({
    queryKey: ["return-orders", id],
    queryFn: () => returnOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateReturnOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Tạo phiếu trả hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu trả hàng thất bại");
    },
  });
}

export function useConfirmStockReceived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      returnOrdersApi.confirmStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Xác nhận nhập hàng trả thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận nhập hàng trả thất bại");
    },
  });
}

export function useConfirmRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      returnOrdersApi.confirmRefund(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Xác nhận hoàn tiền thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận hoàn tiền thất bại");
    },
  });
}

export function useCancelReturnOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnOrdersApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Hủy phiếu trả hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu trả hàng thất bại");
    },
  });
}

export function useUpdateStep1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      returnOrdersApi.updateStep1(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Cập nhật bước 1 thành công");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi cập nhật bước 1");
    },
  });
}
