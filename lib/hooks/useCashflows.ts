import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";
import { apiClient, API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { toast } from "sonner";

export function useCashFlows(params?: any) {
  return useQuery({
    queryKey: ["cashflows", params],
    queryFn: () => cashflowsApi.getCashFlows(params),
  });
}

export function useCashFlow(id: number) {
  return useQuery({
    queryKey: ["cashflows", id],
    queryFn: () => cashflowsApi.getCashFlow(id),
    enabled: !!id,
  });
}

export function useRelatedInvoicePayments(cashFlowId: number) {
  return useQuery({
    queryKey: ["cashflows", cashFlowId, "invoice-payments"],
    queryFn: () => cashflowsApi.getRelatedInvoicePayments(cashFlowId),
    enabled: !!cashFlowId,
  });
}

export function useCreateCashFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cashflowsApi.createCashFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Tạo phiếu thu/chi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu thu/chi thất bại");
    },
  });
}

export function useUpdateCashFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      cashflowsApi.updateCashFlow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Cập nhật phiếu thu/chi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu thu/chi thất bại");
    },
  });
}

export function useCancelCashFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cashflowsApi.cancelCashFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Hủy phiếu thu/chi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu thu/chi thất bại");
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cashflowsApi.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Tạo thanh toán thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo thanh toán thất bại");
    },
  });
}

export function useOpeningBalance(filters: any) {
  return useQuery({
    queryKey: ["cashflows", "opening-balance", filters],
    queryFn: async () => {
      const response = await apiClient.get(
        "/cashflows/opening-balance",
        filters
      );
      return response;
    },
    enabled: !!filters.startDate,
  });
}

export function useExportCashFlows() {
  const [isExportingOverview, setIsExportingOverview] = useState(false);

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
        : `SoQuy_${Date.now()}.xlsx`;

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
    const url = new URL(`${API_URL}/cashflows/export`);
    Object.entries(exportFilters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.append(k, String(v));
      }
    });
    await doExport(url, setIsExportingOverview);
  };

  return {
    exportOverview,
    isExportingOverview,
  };
}
