import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inventoryChecksApi,
  InventoryCheckQueryParams,
  CreateInventoryCheckDto,
} from "@/lib/api/inventory-checks";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useInventoryChecks(params?: InventoryCheckQueryParams) {
  return useQuery({
    queryKey: ["inventory-checks", params],
    queryFn: () => inventoryChecksApi.getAll(params),
  });
}

export function useInventoryCheck(id: number) {
  return useQuery({
    queryKey: ["inventory-check", id],
    queryFn: () => inventoryChecksApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateInventoryCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInventoryCheckDto) =>
      inventoryChecksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-checks"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Tạo phiếu kiểm hàng loại B thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu kiểm thất bại");
    },
  });
}

export function useCancelInventoryCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => inventoryChecksApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-checks"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-check"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Hủy phiếu kiểm thành công");
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

type InventoryCheckExportFilters = Partial<
  Omit<InventoryCheckQueryParams, "page" | "limit">
>;

function buildInventoryCheckExportUrl(
  path: string,
  filters: InventoryCheckExportFilters
): URL {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.append(k, String(v));
  });
  return url;
}

/**
 * Xuất danh sách phiếu kiểm hàng loại B (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi dòng sản phẩm 1 dòng)
 */
export function useExportInventoryChecks() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: InventoryCheckExportFilters) => {
    setIsExporting(true);
    try {
      const url = buildInventoryCheckExportUrl(
        "/inventory-checks/export",
        filters
      );
      await downloadExcelFromUrl(url, `KiemHangLoaiB_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: InventoryCheckExportFilters) => {
    setIsExporting(true);
    try {
      const url = buildInventoryCheckExportUrl(
        "/inventory-checks/export-detail",
        filters
      );
      await downloadExcelFromUrl(
        url,
        `KiemHangLoaiB_ChiTiet_${Date.now()}.xlsx`
      );
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
