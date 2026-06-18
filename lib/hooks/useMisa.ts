import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { misaApi, MisaBuyerOverride } from "../api/misa";
import { toast } from "sonner";

/** Danh sách nhân viên phụ trách (Misa) cho dropdown filter */
export function useMisaEmployees(enabled: boolean = true) {
  return useQuery({
    queryKey: ["misa-employees"],
    queryFn: () => misaApi.getEmployees(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

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
    mutationFn: (vars: {
      invoiceCode: string;
      buyerOverride?: MisaBuyerOverride;
      force?: boolean;
    }) => misaApi.createVoucher(vars.invoiceCode, vars.buyerOverride, vars.force),
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

/** Đẩy hàng loạt hóa đơn lên Misa theo danh sách mã */
export function useCreateVouchersBulk() {
  const invalidate = useInvalidateVat();
  return useMutation({
    mutationFn: (vars: {
      invoiceCodes: string[];
      buyerOverrides?: Record<string, MisaBuyerOverride>;
    }) => misaApi.createVouchersBulk(vars.invoiceCodes, vars.buyerOverrides),
    onSuccess: (res) => {
      if (res.failedCount === 0) {
        toast.success(res.message || "Đẩy hàng loạt thành công");
      } else if (res.successCount > 0) {
        toast.success(
          `Đẩy thành công ${res.successCount}/${res.total} hóa đơn, ${res.failedCount} thất bại`
        );
      } else {
        toast.error(`Tất cả ${res.total} hóa đơn đẩy thất bại`);
      }
      invalidate();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Đẩy hàng loạt thất bại");
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
