import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseOrdersApi } from "../api/purchase-orders";
import type { PurchaseOrderFilters } from "../types/purchase-order";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function usePurchaseOrders(params?: PurchaseOrderFilters) {
  return useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: () => purchaseOrdersApi.getAll(params),
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => purchaseOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Tạo phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu nhập hàng thất bại");
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", variables.id],
      });
      toast.success("Cập nhật phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu nhập hàng thất bại");
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseOrdersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Xóa phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa phiếu nhập hàng thất bại");
    },
  });
}

export function useCreatePurchaseOrderFromOrderSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderSupplierId,
      ...payload
    }: {
      orderSupplierId: number;
      additionalPayment?: number;
      items?: any[];
      payments?: Array<{ method: string; amount: number; accountId?: number }>;
      branchId?: number;
      purchaseDate?: string;
      discount?: number;
      discountRatio?: number;
      isDraft?: boolean;
      partnerType?: string;
      description?: string;
      purchaseById?: number;
    }) =>
      purchaseOrdersApi.createFromOrderSupplier(orderSupplierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Tạo phiếu nhập từ đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu nhập từ đặt hàng nhập thất bại");
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cancelPayments,
    }: {
      id: number;
      cancelPayments?: boolean;
    }) => purchaseOrdersApi.cancel(id, { cancelPayments }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Hủy phiếu nhập hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu nhập hàng thất bại");
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

function buildPurchaseOrderExportUrl(
  path: string,
  filters: PurchaseOrderFilters
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
 * Xuất danh sách phiếu nhập hàng (theo bộ lọc hiện tại) ra file Excel.
 * - exportToFile: xuất tổng quan (mỗi phiếu 1 dòng)
 * - exportDetailToFile: xuất chi tiết (mỗi dòng sản phẩm 1 dòng)
 */
export function useExportPurchaseOrders() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: PurchaseOrderFilters) => {
    setIsExporting(true);
    try {
      const url = buildPurchaseOrderExportUrl("/purchase-orders/export", filters);
      await downloadExcelFromUrl(url, `NhapHang_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: PurchaseOrderFilters) => {
    setIsExporting(true);
    try {
      const url = buildPurchaseOrderExportUrl(
        "/purchase-orders/export-detail",
        filters
      );
      await downloadExcelFromUrl(url, `NhapHang_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
