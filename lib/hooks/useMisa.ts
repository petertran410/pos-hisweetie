import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { misaApi, MisaBuyerOverride, MisaBulkVoucherResult } from "../api/misa";
import { toast } from "sonner";

// Đẩy hàng loạt theo lô nhỏ: backend gửi tuần tự, nghỉ giữa các hóa đơn và tự
// thử lại khi MISA chập chờn, nên mỗi lô cần thời gian. Mỗi request tối đa 90s
// (dưới giới hạn 100s của Cloudflare).
const BULK_CHUNK_SIZE = 5;
const BULK_CHUNK_TIMEOUT_MS = 90_000;

export interface MisaBulkPushSummary {
  total: number;
  results: MisaBulkVoucherResult["results"];
  /** Lô bị lỗi kết nối/timeout: backend có thể vẫn đang xử lý, chưa rõ kết quả. */
  unknownCodes: string[];
  /** Các hóa đơn chưa gửi vì đã dừng sau lô lỗi. */
  notSentCodes: string[];
  stopError: string | null;
}

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
        toast.success("Đã gửi hóa đơn vào hàng đợi Misa");
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
    mutationFn: async (vars: {
      invoiceCodes: string[];
      buyerOverrides?: Record<string, MisaBuyerOverride>;
    }): Promise<MisaBulkPushSummary> => {
      const codes = vars.invoiceCodes;
      const summary: MisaBulkPushSummary = {
        total: codes.length,
        results: [],
        unknownCodes: [],
        notSentCodes: [],
        stopError: null,
      };
      const progressText = (done: number) =>
        `Đang đẩy ${done}/${codes.length} hóa đơn lên Misa…`;
      const toastId = toast.loading(progressText(0));

      try {
        for (let i = 0; i < codes.length; i += BULK_CHUNK_SIZE) {
          const chunk = codes.slice(i, i + BULK_CHUNK_SIZE);
          const chunkOverrides: Record<string, MisaBuyerOverride> = {};
          for (const code of chunk) {
            const override = vars.buyerOverrides?.[code];
            if (override) chunkOverrides[code] = override;
          }

          try {
            const res = await misaApi.createVouchersBulk(
              chunk,
              chunkOverrides,
              undefined,
              BULK_CHUNK_TIMEOUT_MS
            );
            summary.results.push(...res.results);
          } catch (error) {
            // Lô lỗi kết nối có thể vẫn đang chạy ở backend → dừng, không gửi
            // tiếp để tránh dồn request lên MISA.
            summary.stopError =
              error instanceof Error && error.message
                ? error.message
                : "Lỗi kết nối";
            summary.unknownCodes = chunk;
            summary.notSentCodes = codes.slice(i + BULK_CHUNK_SIZE);
            break;
          }

          toast.loading(
            progressText(Math.min(i + BULK_CHUNK_SIZE, codes.length)),
            { id: toastId }
          );
        }
      } finally {
        toast.dismiss(toastId);
      }

      return summary;
    },
    onSuccess: (summary) => {
      const successCount = summary.results.filter((r) => r.success).length;
      if (successCount === summary.total) {
        toast.success(
          `Đã gửi ${successCount}/${summary.total} hóa đơn vào hàng đợi Misa`
        );
      } else if (successCount > 0) {
        // Không dùng màu xanh khi còn hóa đơn chưa gửi được, tránh hiểu nhầm.
        toast.warning(
          `Đã gửi ${successCount}/${summary.total} hóa đơn vào hàng đợi Misa, ${summary.total - successCount} chưa gửi được`
        );
      } else {
        toast.error(`Chưa gửi được hóa đơn nào trong ${summary.total} hóa đơn`);
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
