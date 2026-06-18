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

/** Sale gán (nhiều) khách hàng cho 1 giao dịch Sepay */
export function useAssignSepayCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; customerIds: number[] }) =>
      sepayApi.assignCustomers(vars.id, vars.customerIds),
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

/** Ẩn giao dịch khỏi danh sách (ẩn chung toàn hệ thống) */
export function useHideSepayTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sepayApi.hide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sepay-transactions"] });
      toast.success("Đã ẩn giao dịch");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Ẩn giao dịch thất bại"
      );
    },
  });
}

/** Bỏ ẩn giao dịch — hiển thị lại trong danh sách */
export function useUnhideSepayTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sepayApi.unhide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sepay-transactions"] });
      toast.success("Đã bỏ ẩn giao dịch");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Bỏ ẩn giao dịch thất bại"
      );
    },
  });
}

/** Kế toán xác nhận & tạo phiếu thu theo phân bổ (mỗi khách 1 phiếu) */
export function useConfirmSepayReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      branchId: number;
      collectorUserId?: number;
      allocations: {
        customerId: number;
        amount: number;
        note?: string;
        invoices?: { invoiceId: number; amount: number }[];
      }[];
    }) =>
      sepayApi.confirmReceipt(vars.id, {
        branchId: vars.branchId,
        collectorUserId: vars.collectorUserId,
        allocations: vars.allocations,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["sepay-transactions"] });
      qc.invalidateQueries({ queryKey: ["cashflows"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      const n = res?.cashFlows?.length ?? 0;
      toast.success(
        n > 1
          ? `Đã tạo ${n} phiếu thu trừ công nợ khách hàng`
          : "Đã tạo phiếu thu trừ công nợ khách hàng"
      );
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Tạo phiếu thu thất bại"
      );
    },
  });
}
