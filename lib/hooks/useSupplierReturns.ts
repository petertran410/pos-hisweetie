import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierReturnsApi } from "@/lib/api/supplier-returns";
import type { SupplierReturnFilters } from "@/lib/types/supplier-return";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useSupplierReturns(params?: SupplierReturnFilters) {
  return useQuery({
    queryKey: ["supplier-returns", params],
    queryFn: () => supplierReturnsApi.getAll(params),
  });
}

export function useSupplierReturn(id: number) {
  return useQuery({
    queryKey: ["supplier-returns", id],
    queryFn: () => supplierReturnsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSupplierReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supplierReturnsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      toast.success("Tạo phiếu trả hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu trả hàng nhập thất bại");
    },
  });
}

export function useConfirmExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      supplierReturnsApi.confirmExport(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      if (variables.data.isDraft) {
        toast.success("Lưu tạm thành công");
      } else {
        toast.success("Xác nhận xuất kho thành công");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận xuất kho thất bại");
    },
  });
}

export function useConfirmSupplierRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      supplierReturnsApi.confirmRefund(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      toast.success("Xác nhận hoàn thành phiếu trả hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận thất bại");
    },
  });
}

export function useCancelSupplierReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supplierReturnsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      toast.success("Hủy phiếu trả hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu thất bại");
    },
  });
}

export function useUpdateSupplierReturnStep1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      supplierReturnsApi.updateStep1(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      if (variables.data.isDraft) {
        toast.success("Lưu tạm thành công");
      } else {
        toast.success("Cập nhật phiếu trả hàng nhập thành công");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật thất bại");
    },
  });
}

export function useImportSupplierReturns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: supplierReturnsApi.importFromExcel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
      if (data.failed === 0) {
        toast.success(`Import ${data.imported} phiếu thành công`);
      } else {
        toast.warning(
          `Import hoàn tất: ${data.imported} thành công, ${data.failed} lỗi`
        );
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Import thất bại");
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

function buildSupplierReturnExportUrl(path: string, filters: any): URL {
  const { page: _p, limit: _l, ...exportFilters } = filters || {};
  const url = new URL(`${API_URL}${path}`);
  Object.entries(exportFilters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) {
      if (v.length > 0) url.searchParams.append(k, v.join(","));
    } else {
      url.searchParams.append(k, String(v));
    }
  });
  return url;
}

/**
 * Xuất danh sách phiếu trả hàng nhập (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi dòng sản phẩm 1 dòng)
 */
export function useExportSupplierReturns() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: any) => {
    setIsExporting(true);
    try {
      const url = buildSupplierReturnExportUrl(
        "/supplier-returns/export",
        filters
      );
      await downloadExcelFromUrl(url, `TraHangNhap_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: any) => {
    setIsExporting(true);
    try {
      const url = buildSupplierReturnExportUrl(
        "/supplier-returns/export-detail",
        filters
      );
      await downloadExcelFromUrl(url, `TraHangNhap_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
