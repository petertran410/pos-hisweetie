import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "../api/orders";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "../config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

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

function buildOrderExportUrl(path: string, filters: Record<string, any>): URL {
  const { pageSize: _ps, currentItem: _ci, ...exportFilters } = filters;
  const url = new URL(`${API_URL}${path}`);
  Object.entries(exportFilters).forEach(([k, v]) => {
    if (k.startsWith("_")) return; // param meta client-only
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
 * Xuất Excel đơn đặt hàng (theo bộ lọc hiện tại):
 *   - exportToFile: xuất TỔNG QUAN (mỗi đơn 1 dòng)
 *   - exportDetailToFile: xuất CHI TIẾT (mỗi dòng sản phẩm 1 dòng)
 *
 * Đối xứng useExportOrderSuppliers / useExportPurchaseOrders. BE dùng chung
 * bộ lọc buildOrderListWhere nên file xuất khớp với danh sách đang hiển thị.
 */
export function useExportOrders() {
  const [isExportingOverview, setIsExportingOverview] = useState(false);
  const [isExportingDetail, setIsExportingDetail] = useState(false);

  const exportToFile = async (filters: Record<string, any>) => {
    setIsExportingOverview(true);
    try {
      const url = buildOrderExportUrl("/orders/export", filters);
      await downloadExcelFromUrl(url, `DatHang_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExportingOverview(false);
    }
  };

  const exportDetailToFile = async (filters: Record<string, any>) => {
    setIsExportingDetail(true);
    try {
      const url = buildOrderExportUrl("/orders/export-detail", filters);
      await downloadExcelFromUrl(url, `DatHang_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExportingDetail(false);
    }
  };

  return {
    exportToFile,
    exportDetailToFile,
    isExportingOverview,
    isExportingDetail,
  };
}

export function useOrders(params?: any) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => ordersApi.getOrders(params),
  });
}

/**
 * Tổng các cột tiền của TOÀN BỘ đơn match filter (không phân trang).
 * Dùng cho hàng "tổng" hiển thị ngay dưới header bảng đặt hàng.
 */
export function useOrdersTotals(params?: any) {
  return useQuery({
    queryKey: ["orders-totals", params],
    queryFn: () => ordersApi.getTotals(params),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });
}

export function useProductPriceHistory(
  customerId?: number,
  productId?: number,
  type?: "order" | "invoice",
  branchId?: number
) {
  return useQuery({
    queryKey: ["product-price-history", customerId, productId, type, branchId ?? null],
    queryFn: () =>
      ordersApi.getProductPriceHistory(customerId!, productId!, type, branchId),
    enabled: !!customerId && !!productId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.createOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data.warnings && data.warnings.length > 0) {
        toast.warning("Đơn hàng đã tạo nhưng có cảnh báo", {
          description: data.warnings.map((w) => w.message).join(", "),
        });
      } else {
        toast.success("Tạo đơn hàng thành công");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo đơn hàng thất bại");
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      ordersApi.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật đơn hàng thất bại");
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Xóa đơn hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa đơn hàng thất bại");
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      cancelPayments,
    }: {
      id: number;
      cancelPayments: boolean;
    }) => ordersApi.cancel(id, cancelPayments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Hủy đơn hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hủy đơn hàng");
    },
  });
}

/**
 * Tổng số "Khách đặt" cho 1 batch productIds.
 * Chỉ tính các đơn ở trạng thái Phiếu tạm hoặc Đã xác nhận.
 * Truyền branchId để lọc theo chi nhánh đang chọn (khớp với modal).
 */
export function useOrdersPendingSummary(
  productIds: number[],
  branchId?: number,
  options?: { silentForbidden?: boolean }
) {
  const sortedKey = [...productIds].sort((a, b) => a - b).join(",");
  return useQuery({
    queryKey: ["orders-pending-summary", sortedKey, branchId ?? null],
    queryFn: () => ordersApi.getPendingSummary(productIds, branchId),
    enabled: productIds.length > 0,
    staleTime: 30_000,
    ...(options?.silentForbidden
      ? { meta: { silentForbidden: true } }
      : {}),
  });
}

/**
 * Danh sách đơn hàng (Phiếu tạm/Đã xác nhận) chứa sản phẩm cụ thể.
 * Truyền branchId để lọc theo chi nhánh đang chọn ở DashboardHeader.
 * Dùng cho modal khi click vào số "Khách đặt".
 */
export function useOrdersPendingByProduct(
  productId: number | null,
  branchId?: number
) {
  return useQuery({
    queryKey: ["orders-pending-by-product", productId, branchId ?? null],
    queryFn: () =>
      ordersApi.getPendingByProduct(productId as number, branchId),
    enabled: !!productId,
  });
}
