import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockAuditsApi } from "@/lib/api/stock-audits";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";
import {
  StockAuditQueryParams,
  CreateStockAuditDto,
  UpdateStockAuditDto,
} from "../types/stock-audit";

export function useStockAudits(params?: StockAuditQueryParams) {
  return useQuery({
    queryKey: ["stock-audits", params],
    queryFn: () => stockAuditsApi.getAll(params),
  });
}

export function useStockAudit(id: number) {
  return useQuery({
    queryKey: ["stock-audit", id],
    queryFn: () => stockAuditsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStockAuditDto) => stockAuditsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      toast.success("Tạo phiếu kiểm kho thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu kiểm kho thất bại");
    },
  });
}

export function useUpdateStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateStockAuditDto }) =>
      stockAuditsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      qc.invalidateQueries({ queryKey: ["stock-audit"] });
      toast.success("Cập nhật phiếu kiểm kho thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật thất bại");
    },
  });
}

export function useCompleteStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockAuditsApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      qc.invalidateQueries({ queryKey: ["stock-audit"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Hoàn thành phiếu kiểm kho — đã điều chỉnh tồn kho");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hoàn thành thất bại");
    },
  });
}

export function useCancelStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockAuditsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      qc.invalidateQueries({ queryKey: ["stock-audit"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Hủy phiếu kiểm kho thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu kiểm thất bại");
    },
  });
}

async function downloadExcelFromUrl(url: URL, filename: string) {
  const token = useAuthStore.getState().token;
  const selectedBranch = useBranchStore.getState().selectedBranch;

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(selectedBranch?.id
        ? { "X-Branch-Id": String(selectedBranch.id) }
        : {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Lỗi khi xuất dữ liệu");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename=([^;]+)/);
  const finalName = match ? match[1].trim() : filename;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

type StockAuditExportFilters = Partial<
  Omit<StockAuditQueryParams, "details" | "page" | "limit">
>;

function buildStockAuditExportUrl(
  path: string,
  filters: StockAuditExportFilters
): URL {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.append(k, String(v));
  });
  return url;
}

/**
 * Xuất danh sách phiếu kiểm kho (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi dòng sản phẩm 1 dòng)
 */
export function useExportStockAudits() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: StockAuditExportFilters) => {
    setIsExporting(true);
    try {
      const url = buildStockAuditExportUrl("/stock-audits/export", filters);
      await downloadExcelFromUrl(url, `KiemKho_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: StockAuditExportFilters) => {
    setIsExporting(true);
    try {
      const url = buildStockAuditExportUrl(
        "/stock-audits/export-detail",
        filters
      );
      await downloadExcelFromUrl(url, `KiemKho_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
