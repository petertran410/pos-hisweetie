import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sepayApi, SepayTransactionsParams } from "../api/sepay";
import { toast } from "sonner";

/** Đồng bộ toàn bộ lịch sử giao dịch Sepay về bảng riêng */
export function useSyncSepayTransactions() {
  return useMutation({
    mutationFn: () => sepayApi.syncTransactions(),
    onSuccess: (res) => {
      if (res.success) {
        const r = res.result;
        toast.success(
          `Đồng bộ giao dịch Sepay thành công ` +
            `(Tải về: ${r.fetched}, Thêm mới: ${r.created}, Cập nhật: ${r.updated})`
        );
      } else {
        toast.error("Đồng bộ giao dịch Sepay thất bại");
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Đồng bộ giao dịch Sepay thất bại";
      toast.error(message);
    },
  });
}

/** Danh sách giao dịch Sepay đã đồng bộ (biến động số dư) */
export function useSepayTransactions(params?: SepayTransactionsParams) {
  return useQuery({
    queryKey: ["sepay-transactions", params],
    queryFn: () => sepayApi.getTransactions(params),
    placeholderData: (prev) => prev,
  });
}

/** Sale gán khách hàng cho 1 giao dịch Sepay */
export function useAssignSepayCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; customerId: number }) =>
      sepayApi.assignCustomer(vars.id, vars.customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sepay-transactions"] });
      toast.success("Đã gán khách hàng cho giao dịch");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Gán khách hàng thất bại"
      );
    },
  });
}

/** Bỏ gán khách hàng */
export function useUnassignSepayCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sepayApi.unassignCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sepay-transactions"] });
      toast.success("Đã bỏ gán khách hàng");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Bỏ gán khách hàng thất bại"
      );
    },
  });
}

/** Kế toán xác nhận & tạo phiếu thu từ giao dịch Sepay */
export function useConfirmSepayReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      branchId: number;
      collectorUserId?: number;
      description?: string;
    }) =>
      sepayApi.confirmReceipt(vars.id, {
        branchId: vars.branchId,
        collectorUserId: vars.collectorUserId,
        description: vars.description,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sepay-transactions"] });
      qc.invalidateQueries({ queryKey: ["cashflows"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Đã tạo phiếu thu trừ công nợ khách hàng");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Tạo phiếu thu thất bại"
      );
    },
  });
}
