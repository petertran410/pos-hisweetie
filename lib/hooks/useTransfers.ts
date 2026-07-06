import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  transfersApi,
  type TransferQueryParams,
  type CreateTransferData,
  type CancelTransferData,
} from "../api/transfers";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useTransfers(params?: TransferQueryParams) {
  return useQuery({
    queryKey: ["transfers", params],
    queryFn: () => transfersApi.getAll(params),
  });
}

export function useTransfer(id: number) {
  return useQuery({
    queryKey: ["transfers", id],
    queryFn: () => transfersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferData) => transfersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: () => {
      toast.error("Không thể tạo phiếu chuyển hàng");
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateTransferData>;
    }) => transfersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: () => {
      toast.error("Không thể cập nhật phiếu chuyển hàng");
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transfersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success("Xóa phiếu chuyển hàng thành công");
    },
    onError: () => {
      toast.error("Không thể xóa phiếu chuyển hàng");
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: CancelTransferData }) =>
      transfersApi.cancel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
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

function buildTransferExportUrl(
  path: string,
  filters: TransferQueryParams
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
 * Xuất danh sách phiếu chuyển hàng (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi dòng sản phẩm 1 dòng)
 */
export function useExportTransfers() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: TransferQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildTransferExportUrl("/transfers/export", filters);
      await downloadExcelFromUrl(url, `ChuyenHang_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: TransferQueryParams) => {
    setIsExporting(true);
    try {
      const url = buildTransferExportUrl("/transfers/export-detail", filters);
      await downloadExcelFromUrl(url, `ChuyenHang_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
