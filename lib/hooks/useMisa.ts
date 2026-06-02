import { useMutation, useQueryClient } from "@tanstack/react-query";
import { misaApi } from "../api/misa";
import { toast } from "sonner";

/** Invalidate cả list + totals của trang hóa đơn VAT sau mỗi thao tác Misa */
function useInvalidateVat() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["invoices-vat"] });
    queryClient.invalidateQueries({ queryKey: ["invoices-vat-totals"] });
  };
}

/** Đẩy 1 hóa đơn lên Misa */
export function useCreateVoucher() {
  const invalidate = useInvalidateVat();
  return useMutation({
    mutationFn: (invoiceCode: string) => misaApi.createVoucher(invoiceCode),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || "Đẩy hóa đơn lên Misa thành công");
      } else {
        toast.error(res.message || "Đẩy hóa đơn lên Misa thất bại");
      }
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Đẩy hóa đơn lên Misa thất bại");
    },
  });
}

/** Retry các hóa đơn đẩy Misa bị FAILED */
export function useRetryVouchers() {
  const invalidate = useInvalidateVat();
  return useMutation({
    mutationFn: () => misaApi.retryVouchers(),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(
          `Đã retry ${res.retriedCount ?? 0} hóa đơn thành công`
        );
      } else {
        toast.error(res.message || "Retry thất bại");
      }
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Retry thất bại");
    },
  });
}

/** Xóa đề nghị sinh chứng từ Misa theo mã hóa đơn */
export function useDeleteVoucher() {
  const invalidate = useInvalidateVat();
  return useMutation({
    mutationFn: (invoiceCode: string) => misaApi.deleteVoucher(invoiceCode),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || "Xóa chứng từ Misa thành công");
      } else {
        toast.error(res.message || "Xóa chứng từ Misa thất bại");
      }
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Xóa chứng từ Misa thất bại");
    },
  });
}

/** Đồng bộ toàn bộ danh mục Misa về database */
export function useSyncMisaDictionary() {
  return useMutation({
    mutationFn: () => misaApi.syncDictionary(),
    onSuccess: (res) => {
      if (res.success) {
        const d = res.data;
        const detail = d
          ? ` (Hàng hóa: ${d.inventoryItems}, Kho: ${d.stocks}, Đối tượng: ${d.accountObjects}, Đơn vị: ${d.organizationUnits})`
          : "";
        toast.success(`${res.message || "Đồng bộ danh mục Misa thành công"}${detail}`);
      } else {
        toast.error(res.message || "Đồng bộ danh mục Misa thất bại");
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Đồng bộ danh mục Misa thất bại");
    },
  });
}
