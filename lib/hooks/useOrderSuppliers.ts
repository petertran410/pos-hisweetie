import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderSuppliersApi } from "../api/order-suppliers";
import type { OrderSupplierFilters } from "../types/order-supplier";
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

function buildOrderSupplierExportUrl(
  path: string,
  filters: OrderSupplierFilters
): URL {
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
 * Xuất Excel phiếu đặt hàng nhập (theo bộ lọc hiện tại):
 *   - exportToFile: xuất TỔNG QUAN (mỗi phiếu 1 dòng)
 *   - exportDetailToFile: xuất CHI TIẾT (mỗi dòng sản phẩm 1 dòng)
 *
 * Cả hai dùng chung hook này vì backend dùng cùng query filter — đối xứng
 * `useExportPurchaseOrders` của nhập hàng.
 */
export function useExportOrderSuppliers() {
  const [isExportingOverview, setIsExportingOverview] = useState(false);
  const [isExportingDetail, setIsExportingDetail] = useState(false);

  const exportToFile = async (filters: OrderSupplierFilters) => {
    setIsExportingOverview(true);
    try {
      const url = buildOrderSupplierExportUrl(
        "/order-suppliers/export",
        filters
      );
      await downloadExcelFromUrl(url, `DatHangNhap_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExportingOverview(false);
    }
  };

  const exportDetailToFile = async (filters: OrderSupplierFilters) => {
    setIsExportingDetail(true);
    try {
      const url = buildOrderSupplierExportUrl(
        "/order-suppliers/export-detail",
        filters
      );
      await downloadExcelFromUrl(url, `DatHangNhap_ChiTiet_${Date.now()}.xlsx`);
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

export function useOrderSuppliers(params?: OrderSupplierFilters) {
  return useQuery({
    queryKey: ["order-suppliers", params],
    queryFn: () => orderSuppliersApi.getAll(params),
  });
}

/** Bảng phẳng dòng sản phẩm của PĐN — trang "Đặt hàng nhập chi tiết". */
export function useOrderSupplierDetailItems(params?: OrderSupplierFilters) {
  return useQuery({
    queryKey: ["order-supplier-detail-items", params],
    queryFn: () => orderSuppliersApi.getDetailItems(params),
  });
}

/**
 * Cập nhật inline giá nhà máy / thành tiền nhà máy của 1 dòng sản phẩm
 * trên trang "Đặt hàng nhập chi tiết".
 */
export function useUpdateOrderSupplierItemFactoryPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderSupplierId,
      productId,
      data,
    }: {
      orderSupplierId: number;
      productId: number;
      data: { factoryPrice?: number | null; factorySubTotal?: number | null };
    }) =>
      orderSuppliersApi.updateItemFactoryPrice(
        orderSupplierId,
        productId,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["order-supplier-detail-items"],
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật giá nhà máy thất bại");
    },
  });
}

/**
 * Cập nhật inline giai đoạn hiện tại / nhà máy của 1 dòng sản phẩm
 * trên trang "Đặt hàng nhập chi tiết".
 */
export function useUpdateOrderSupplierItemStageFactory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderSupplierId,
      productId,
      data,
    }: {
      orderSupplierId: number;
      productId: number;
      data: { productionStageId?: number | null; factoryId?: number | null };
    }) =>
      orderSuppliersApi.updateItemStageFactory(
        orderSupplierId,
        productId,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["order-supplier-detail-items"],
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật giai đoạn / nhà máy thất bại");
    },
  });
}

export function useOrderSupplier(id: number) {
  return useQuery({
    queryKey: ["order-suppliers", id],
    queryFn: () => orderSuppliersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderSuppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      toast.success("Tạo phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu đặt hàng nhập thất bại");
    },
  });
}

export function useUpdateOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      orderSuppliersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({
        queryKey: ["order-suppliers", variables.id],
      });
      toast.success("Cập nhật phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu đặt hàng nhập thất bại");
    },
  });
}

export function useDeleteOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderSuppliersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      toast.success("Xóa phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa phiếu đặt hàng nhập thất bại");
    },
  });
}

/**
 * Hủy mềm PDN. Đối xứng `useCancelOrder` của phía bán.
 *   - cancelPayments=true → soft cancel toàn bộ payment + cashflow PCPDN
 *   - cancelPayments=false → throw nếu PDN còn payment active
 */
export function useCancelOrderSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      cancelPayments,
    }: {
      id: number;
      cancelPayments: boolean;
    }) => orderSuppliersApi.cancel(id, cancelPayments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Hủy phiếu đặt hàng nhập thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hủy phiếu đặt hàng nhập");
    },
  });
}

/**
 * Chốt hoàn thành PDN thủ công khi NCC không giao nốt phần còn thiếu.
 * Set status=3 + toComplete=true. Backend chặn nếu đã hủy/đã hoàn thành.
 */
export function useCompleteOrderSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => orderSuppliersApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      toast.success("Đã chốt hoàn thành phiếu đặt hàng nhập");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hoàn thành phiếu đặt hàng nhập");
    },
  });
}

export function useOrderSupplierPayments(orderSupplierId: number) {
  return useQuery({
    queryKey: ["order-supplier-payments", orderSupplierId],
    queryFn: () => orderSuppliersApi.getPayments(orderSupplierId),
    enabled: !!orderSupplierId,
  });
}

/**
 * Tổng số "Đặt NCC" cho 1 batch productIds.
 * Chỉ tính các phiếu OrderSupplier ở trạng thái Đã xác nhận NCC hoặc Nhập một phần.
 * Truyền branchId nếu muốn lọc theo chi nhánh.
 *
 * Đối xứng `useOrdersPendingSummary` của phía bán.
 */
export function useOrderSuppliersConfirmedSummary(
  productIds: number[],
  branchId?: number,
  options?: { silentForbidden?: boolean }
) {
  const sortedKey = [...productIds].sort((a, b) => a - b).join(",");
  return useQuery({
    queryKey: [
      "order-suppliers-confirmed-summary",
      sortedKey,
      branchId ?? null,
    ],
    queryFn: () =>
      orderSuppliersApi.getConfirmedSummary(productIds, branchId),
    enabled: productIds.length > 0,
    staleTime: 30_000,
    ...(options?.silentForbidden
      ? { meta: { silentForbidden: true } }
      : {}),
  });
}

/**
 * Danh sách phiếu đặt hàng nhập (Đã xác nhận NCC / Nhập một phần) chứa
 * sản phẩm cụ thể. Truyền branchId để lọc theo chi nhánh đang chọn.
 * Dùng cho modal khi click vào số "Đặt NCC".
 *
 * Đối xứng `useOrdersPendingByProduct` của phía bán.
 */
export function useOrderSuppliersConfirmedByProduct(
  productId: number | null,
  branchId?: number
) {
  return useQuery({
    queryKey: [
      "order-suppliers-confirmed-by-product",
      productId,
      branchId ?? null,
    ],
    queryFn: () =>
      orderSuppliersApi.getConfirmedByProduct(productId as number, branchId),
    enabled: !!productId,
  });
}
