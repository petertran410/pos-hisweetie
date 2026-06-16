import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "../api/invoices";
import { toast } from "sonner";
import { API_URL, apiClient } from "../config/api";
import { useState } from "react";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useInvoices(params?: any) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => invoicesApi.getInvoices(params),
  });
}

/**
 * Tổng các cột tiền của TOÀN BỘ hóa đơn match filter (không phân trang).
 * Dùng cho hàng "tổng" hiển thị ngay dưới header bảng hóa đơn.
 */
export function useInvoicesTotals(params?: any) {
  return useQuery({
    queryKey: ["invoices-totals", params],
    queryFn: () => invoicesApi.getTotals(params),
  });
}

export function useInvoicesForPacking(params?: {
  branchId?: number;
  pageSize?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ["invoices", "for-packing", params],
    queryFn: () => invoicesApi.getInvoicesForPacking(params),
  });
}

/**
 * Tổng quan giao hàng trong ngày cho trang báo đơn:
 * 3 ô thống kê (total/delivered/pending) + danh sách hóa đơn chưa giao.
 */
export function useDeliveryOverview(params?: {
  branchId?: number;
  date?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  pageSize?: number;
  currentItem?: number;
}) {
  return useQuery({
    queryKey: ["invoices", "delivery-overview", params],
    queryFn: () => invoicesApi.getDeliveryOverview(params),
  });
}

/** Danh sách hóa đơn VAT (dữ liệu Misa) cho trang /don-hang/hoa-don-vat */
export function useInvoicesVat(params?: any) {
  return useQuery({
    queryKey: ["invoices-vat", params],
    queryFn: () => invoicesApi.getInvoicesVat(params),
  });
}

/** Tổng các cột VAT của toàn bộ hóa đơn match filter */
export function useInvoicesVatTotals(params?: any) {
  return useQuery({
    queryKey: ["invoices-vat-totals", params],
    queryFn: () => invoicesApi.getVatTotals(params),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Tạo hóa đơn thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo hóa đơn thất bại");
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      invoicesApi.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật hóa đơn thất bại");
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Xóa hóa đơn thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa hóa đơn thất bại");
    },
  });
}

export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      additionalPayment,
      items,
      payments,
      forceComplete,
    }: {
      orderId: number;
      additionalPayment?: number;
      items?: any[];
      payments?: Array<{ method: string; amount: number }>;
      forceComplete?: boolean;
    }) =>
      invoicesApi.createInvoiceFromOrder(
        orderId,
        additionalPayment,
        items,
        payments,
        undefined,
        forceComplete
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo hóa đơn từ đơn hàng thất bại");
    },
  });
}

export function useUnpaidInvoicesByPartner(
  partnerId: number | null,
  partnerType: string
) {
  return useQuery({
    queryKey: ["invoices", "unpaid", partnerId, partnerType],
    queryFn: async () => {
      if (!partnerId || !partnerType) {
        return { data: [] };
      }
      const response = await apiClient.get<{ data: any[] }>(
        "/invoices/unpaid-by-partner",
        {
          partnerId: partnerId.toString(),
          partnerType,
        }
      );
      return response;
    },
    enabled: !!partnerId && !!partnerType,
  });
}

export function useInvoicesForReturnOrder(params: {
  search?: string;
  branchId?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["invoices", "for-return-order", params],
    queryFn: () => invoicesApi.getInvoicesForReturnOrder(params),
  });
}

export function useExportInvoices() {
  const [isExportingOverview, setIsExportingOverview] = useState(false);
  const [isExportingDetail, setIsExportingDetail] = useState(false);

  const doExport = async (url: URL, setLoading: (v: boolean) => void) => {
    setLoading(true);
    try {
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
      const filenameMatch = disposition.match(/filename=([^;]+)/);
      const filename = filenameMatch
        ? filenameMatch[1].trim()
        : `HoaDon_${Date.now()}.xlsx`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const exportOverview = async (filters: Record<string, any>) => {
    const { pageSize: _ps, currentItem: _ci, ...exportFilters } = filters;
    const url = new URL(`${API_URL}/invoices/export`);
    Object.entries(exportFilters).forEach(([k, v]) => {
      if (k.startsWith("_")) return; // param meta client-only (vd "_preset")
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.append(k, String(v));
      }
    });
    await doExport(url, setIsExportingOverview);
  };

  const exportDetail = async (
    filters: Record<string, any>,
    selectedColumns: string[]
  ) => {
    const { pageSize: _ps, currentItem: _ci, ...exportFilters } = filters;
    const url = new URL(`${API_URL}/invoices/export-detail`);
    Object.entries(exportFilters).forEach(([k, v]) => {
      if (k.startsWith("_")) return; // param meta client-only (vd "_preset")
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.append(k, String(v));
      }
    });
    if (selectedColumns.length > 0) {
      url.searchParams.append("columns", selectedColumns.join(","));
    }
    await doExport(url, setIsExportingDetail);
  };

  return {
    exportOverview,
    exportDetail,
    isExportingOverview,
    isExportingDetail,
  };
}
