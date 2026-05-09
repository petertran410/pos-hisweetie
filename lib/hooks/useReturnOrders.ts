import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { returnOrdersApi } from "../api/return-orders";
import { toast } from "sonner";
import { useSandboxStore } from "../store/sandbox";
import { useSandboxDataStore } from "../store/sandbox-data";
import { sandboxQuery } from "../utils/sandbox-filters";

export function useReturnOrders(params?: any) {
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useQuery({
    queryKey: ["return-orders", params, isSandbox],
    queryFn: () => {
      if (isSandbox) {
        const items = useSandboxDataStore
          .getState()
          .getEntities("returnOrders");
        return sandboxQuery(items, params);
      }
      return returnOrdersApi.getAll(params);
    },
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
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: (data: any) => {
      if (isSandbox) {
        const newItem = useSandboxDataStore
          .getState()
          .addEntity("returnOrders", {
            ...data,
            invoiceId: data.invoiceIds?.[0] || null,
            status: 1,
            statusValue: "Yêu cầu trả hàng",
            totalReturnAmount: data.totalReturnAmount || 0,
            refundAmount: 0,
            refundedAmount: 0,
            customer: data._customer || null,
            branch: data._branch || null,
            creator: data._creator || null,
            details: data.details || [],
          });
        return Promise.resolve(newItem);
      }
      return returnOrdersApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success(
        isSandbox
          ? "Tạo phiếu trả hàng sandbox thành công"
          : "Tạo phiếu trả hàng thành công"
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu trả hàng thất bại");
    },
  });
}

export function useConfirmStockReceived() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      if (isSandbox) {
        useSandboxDataStore.getState().updateEntity("returnOrders", id, {
          ...data,
          status: 3,
          statusValue: "Yêu cầu hoàn tiền",
        });
        return Promise.resolve({});
      }
      return returnOrdersApi.confirmStock(id, data);
    },
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
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      if (isSandbox) {
        useSandboxDataStore.getState().updateEntity("returnOrders", id, {
          status: 4,
          statusValue: "Hoàn thành",
          refundAmount: data.refundAmount || 0,
          refundedAmount: data.refundAmount || 0,
          refundType: data.refundType || "cash",
        });
        return Promise.resolve({});
      }
      return returnOrdersApi.confirmRefund(id, data);
    },
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
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: (id: number) => {
      if (isSandbox) {
        useSandboxDataStore.getState().updateEntity("returnOrders", id, {
          status: 5,
          statusValue: "Đã hủy",
        });
        return Promise.resolve({});
      }
      return returnOrdersApi.cancel(id);
    },
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
