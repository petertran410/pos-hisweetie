import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  internalUsesApi,
  type InternalUseQueryParams,
} from "../api/internalUses";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useInternalUses(params?: InternalUseQueryParams) {
  return useQuery({
    queryKey: ["internal-uses", params],
    queryFn: () => internalUsesApi.getAll(params),
  });
}

export function useInternalUse(id: number) {
  return useQuery({
    queryKey: ["internal-uses", id],
    queryFn: () => internalUsesApi.getById(id),
    enabled: !!id,
  });
}

export function useInternalUsePurposes() {
  return useQuery({
    queryKey: ["internal-use-purposes"],
    queryFn: () => internalUsesApi.getPurposes(),
  });
}

export function useCreatePurpose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; order?: number }) =>
      internalUsesApi.createPurpose(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-purposes"] });
      toast.success("Tạo mục đích sử dụng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo mục đích sử dụng thất bại");
    },
  });
}

export function useUpdatePurpose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; order?: number };
    }) => internalUsesApi.updatePurpose(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-purposes"] });
      toast.success("Cập nhật mục đích sử dụng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật mục đích sử dụng thất bại");
    },
  });
}

export function useDeletePurpose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => internalUsesApi.deletePurpose(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-purposes"] });
      toast.success("Xóa mục đích sử dụng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa mục đích sử dụng thất bại");
    },
  });
}

export function useCreateInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: internalUsesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      toast.success("Tạo phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu xuất dùng nội bộ thất bại");
    },
  });
}

export function useUpdateInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      internalUsesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      queryClient.invalidateQueries({
        queryKey: ["internal-uses", variables.id],
      });
      toast.success("Cập nhật phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu xuất dùng nội bộ thất bại");
    },
  });
}

export function useCompleteInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => internalUsesApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      queryClient.invalidateQueries({ queryKey: ["internal-uses", id] });
      toast.success("Hoàn thành phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hoàn thành phiếu thất bại");
    },
  });
}

export function useCancelInternalUse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: any }) =>
      internalUsesApi.cancel(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["internal-uses"] });
      queryClient.invalidateQueries({
        queryKey: ["internal-uses", variables.id],
      });
      toast.success("Hủy phiếu xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu xuất dùng nội bộ thất bại");
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

function buildInternalUseExportUrl(
  path: string,
  filters: InternalUseQueryParams
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
 * Xuất danh sách phiếu xuất dùng nội bộ (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi sản phẩm 1 dòng)
 */
export function useExportInternalUses() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: InternalUseQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildInternalUseExportUrl(
        "/internal-use/export",
        filters
      );
      await downloadExcelFromUrl(url, `XuatDungNoiBo_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: InternalUseQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildInternalUseExportUrl(
        "/internal-use/export-detail",
        filters
      );
      await downloadExcelFromUrl(
        url,
        `XuatDungNoiBo_ChiTiet_${Date.now()}.xlsx`
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
