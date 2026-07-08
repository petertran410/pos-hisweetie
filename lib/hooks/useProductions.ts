import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  productionsApi,
  type ProductionQueryParams,
  type CreateProductionData,
} from "../api/productions";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useProductions(params?: ProductionQueryParams) {
  return useQuery({
    queryKey: ["productions", params],
    queryFn: () => productionsApi.getAll(params),
  });
}

export function useProduction(id: number) {
  return useQuery({
    queryKey: ["productions", id],
    queryFn: () => productionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductionData) => productionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      toast.success("Tạo phiếu sản xuất thành công");
    },
    onError: () => {
      toast.error("Không thể tạo phiếu sản xuất");
    },
  });
}

export function useUpdateProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateProductionData>;
    }) => productionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      toast.success("Cập nhật phiếu sản xuất thành công");
    },
    onError: () => {
      toast.error("Không thể cập nhật phiếu sản xuất");
    },
  });
}

export function useDeleteProduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => productionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      toast.success("Xóa phiếu sản xuất thành công");
    },
    onError: () => {
      toast.error("Không thể xóa phiếu sản xuất");
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

function buildProductionExportUrl(
  path: string,
  filters: ProductionQueryParams
): URL {
  const { pageSize: _ps, currentItem: _ci, ...exportFilters } = filters;
  const url = new URL(`${API_URL}${path}`);
  Object.entries(exportFilters).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      if (v.length > 0) url.searchParams.append(k, v.join(","));
    } else {
      url.searchParams.append(k, String(v));
    }
  });
  return url;
}

/**
 * Xuất danh sách phiếu sản xuất (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi nguyên liệu 1 dòng)
 */
export function useExportProductions() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: ProductionQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildProductionExportUrl("/productions/export", filters);
      await downloadExcelFromUrl(url, `SanXuat_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: ProductionQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildProductionExportUrl(
        "/productions/export-detail",
        filters
      );
      await downloadExcelFromUrl(url, `SanXuat_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
