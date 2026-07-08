import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  destructionsApi,
  type DestructionQueryParams,
} from "../api/destructions";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useDestructions(params?: DestructionQueryParams) {
  return useQuery({
    queryKey: ["destructions", params],
    queryFn: () => destructionsApi.getAll(params),
  });
}

export function useDestruction(id: number) {
  return useQuery({
    queryKey: ["destructions", id],
    queryFn: () => destructionsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: destructionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      toast.success("Tạo phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu xuất hủy thất bại");
    },
  });
}

export function useUpdateDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      destructionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      queryClient.invalidateQueries({
        queryKey: ["destructions", variables.id],
      });
      toast.success("Cập nhật phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu xuất hủy thất bại");
    },
  });
}

export function useDeleteDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: destructionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      toast.success("Xóa phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa phiếu xuất hủy thất bại");
    },
  });
}

export function useCancelDestruction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: any }) =>
      destructionsApi.cancel(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["destructions"] });
      queryClient.invalidateQueries({
        queryKey: ["destructions", variables.id],
      });
      toast.success("Hủy phiếu xuất hủy thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu xuất hủy thất bại");
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

function buildDestructionExportUrl(
  path: string,
  filters: DestructionQueryParams
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
 * Xuất danh sách phiếu xuất hủy (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi sản phẩm hủy 1 dòng)
 */
export function useExportDestructions() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: DestructionQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildDestructionExportUrl("/destructions/export", filters);
      await downloadExcelFromUrl(url, `XuatHuy_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: DestructionQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildDestructionExportUrl(
        "/destructions/export-detail",
        filters
      );
      await downloadExcelFromUrl(url, `XuatHuy_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
