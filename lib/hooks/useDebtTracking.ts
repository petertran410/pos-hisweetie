import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  debtTrackingApi,
  DebtTrackingParams,
  UpsertDebtPolicyPayload,
} from "../api/debt-tracking";

const KEY = "debt-tracking";

/** Danh sách theo dõi công nợ. */
export function useDebtTracking(params?: DebtTrackingParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => debtTrackingApi.getList(params),
    placeholderData: (prev) => prev,
  });
}

/**
 * Tìm nhanh khách trong theo dõi công nợ — dùng khi thêm khách trực tiếp
 * vào phiếu thu hồi nợ. Chỉ gọi khi có từ khóa.
 */
export function useDebtTrackingSearch(search?: string) {
  return useQuery({
    queryKey: [KEY, "quick-search", search ?? ""],
    queryFn: () =>
      debtTrackingApi.getList({
        search: search || undefined,
        pageSize: 8,
      }),
    enabled: !!search,
    placeholderData: (prev) => prev,
  });
}

/** Số liệu tổng hợp — dùng chung filter với danh sách để không lệch nhau. */
export function useDebtTrackingSummary(params?: DebtTrackingParams) {
  return useQuery({
    queryKey: [KEY, "summary", params],
    queryFn: () => debtTrackingApi.getSummary(params),
    placeholderData: (prev) => prev,
  });
}

export function useDebtTrackingDetail(customerId?: number) {
  return useQuery({
    queryKey: [KEY, "detail", customerId],
    queryFn: () => debtTrackingApi.getDetail(customerId as number),
    enabled: !!customerId,
  });
}

/** Gợi ý số tiền tối thiểu cần thu khi tạo phiếu thu hồi nợ. */
export function useSuggestedMinimum(customerId?: number) {
  return useQuery({
    queryKey: [KEY, "suggested-minimum", customerId],
    queryFn: () => debtTrackingApi.getSuggestedMinimum(customerId as number),
    enabled: !!customerId,
  });
}

export function useDebtPolicy(customerId?: number) {
  return useQuery({
    queryKey: [KEY, "policy", customerId],
    queryFn: () => debtTrackingApi.getPolicy(customerId as number),
    enabled: !!customerId,
  });
}

export function useUpsertDebtPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      customerId: number;
      payload: UpsertDebtPolicyPayload;
    }) => debtTrackingApi.upsertPolicy(vars.customerId, vars.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success("Đã cập nhật thiết lập công nợ");
    },
    onError: (e: unknown) => {
      toast.error(
        e instanceof Error ? e.message : "Cập nhật chính sách thất bại"
      );
    },
  });
}

/**
 * Cập nhật ghi chú. Chỉ truyền đúng cột muốn sửa — hai cột kế toán và sale
 * có quyền riêng, gửi kèm cột không có quyền sẽ bị backend từ chối.
 */
export function useUpdateDebtNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      customerId: number;
      accountantNote?: string | null;
      saleNote?: string | null;
    }) => {
      const { customerId, ...payload } = vars;
      return debtTrackingApi.updateNote(customerId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Lưu ghi chú thất bại");
    },
  });
}

export function useExportDebtTracking() {
  return useMutation({
    mutationFn: (params?: DebtTrackingParams) =>
      debtTrackingApi.exportExcel(params),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      a.download = `theo-doi-cong-no_${now.getFullYear()}${pad(
        now.getMonth() + 1
      )}${pad(now.getDate())}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Excel");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Xuất Excel thất bại");
    },
  });
}

// ==================================================================
// IMPORT EXCEL
// ==================================================================

/** Bước 1: kiểm tra file. Không ghi DB nên không cần invalidate cache. */
export function usePreviewDebtPolicyImport() {
  return useMutation({
    mutationFn: (file: File) => debtTrackingApi.previewImport(file),
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Kiểm tra file thất bại");
    },
  });
}

/** Bước 2: ghi DB. */
export function useCommitDebtPolicyImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => debtTrackingApi.commitImport(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      toast.success(res.message);
      if (res.warningCount > 0) {
        toast.warning(`${res.warningCount} dòng có cảnh báo, hãy kiểm tra lại`);
      }
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Import thất bại");
    },
  });
}

export function useDownloadDebtPolicyTemplate() {
  return useMutation({
    mutationFn: () => debtTrackingApi.downloadTemplate(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mau-thiet-lap-cong-no.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Tải file mẫu thất bại");
    },
  });
}
