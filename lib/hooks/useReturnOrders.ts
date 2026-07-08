import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { returnOrdersApi } from "../api/return-orders";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useReturnOrders(params?: any) {
  return useQuery({
    queryKey: ["return-orders", params],
    queryFn: () => returnOrdersApi.getAll(params),
  });
}

export function useReturnOrder(id: number) {
  return useQuery({
    queryKey: ["return-orders", id],
    queryFn: () => returnOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateReturnOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Tạo phiếu trả hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu trả hàng thất bại");
    },
  });
}

export function useConfirmStockReceived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      returnOrdersApi.confirmStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Xác nhận nhập hàng trả thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận nhập hàng trả thất bại");
    },
  });
}

export function useConfirmRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      returnOrdersApi.confirmRefund(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Xác nhận hoàn tiền thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xác nhận hoàn tiền thất bại");
    },
  });
}

export function useCancelReturnOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnOrdersApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Hủy phiếu trả hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu trả hàng thất bại");
    },
  });
}

export function useUpdateStep1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      returnOrdersApi.updateStep1(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["return-orders"] });
      toast.success("Cập nhật bước 1 thành công");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Lỗi cập nhật bước 1");
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

function buildReturnOrderExportUrl(path: string, filters: any): URL {
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
 * Xuất danh sách phiếu trả hàng (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi dòng sản phẩm 1 dòng)
 */
export function useExportReturnOrders() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: any) => {
    setIsExporting(true);
    try {
      const url = buildReturnOrderExportUrl("/return-orders/export", filters);
      await downloadExcelFromUrl(url, `TraHang_${Date.now()}.xlsx`);
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
      const url = buildReturnOrderExportUrl(
        "/return-orders/export-detail",
        filters
      );
      await downloadExcelFromUrl(url, `TraHang_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
