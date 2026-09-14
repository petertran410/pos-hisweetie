import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";
import { apiClient, API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { toast } from "sonner";
import type {
  CashFlowMutationPayload,
  CashFlowQueryParams,
  CashFlowSummary,
} from "@/lib/types/cashflow";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useCashFlows(params?: CashFlowQueryParams) {
  return useQuery({
    queryKey: ["cashflows", params],
    queryFn: () => cashflowsApi.getCashFlows(params),
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
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
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Tạo phiếu thu/chi thất bại"));
    },
  });
}

export function useUpdateCashFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: CashFlowMutationPayload;
    }) =>
      cashflowsApi.updateCashFlow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Cập nhật phiếu thu/chi thành công");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Cập nhật phiếu thu/chi thất bại"));
    },
  });
}

export function useCancelCashFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cashflowsApi.cancelCashFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      // Hủy phiếu thu làm thay đổi trạng thái đối soát Sepay và số tiền chưa gắn.
      queryClient.invalidateQueries({ queryKey: ["sepay-transactions"] });
      toast.success("Hủy phiếu thu/chi thành công");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Hủy phiếu thu/chi thất bại"));
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
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Tạo thanh toán thất bại"));
    },
  });
}

export function useOpeningBalance(filters: CashFlowQueryParams | null) {
  return useQuery({
    queryKey: ["cashflows", "opening-balance", filters],
    queryFn: async () => {
      const response = await apiClient.get(
        "/cashflows/opening-balance",
        filters ?? undefined
      );
      return response;
    },
    // filters có thể là null khi user không có quyền cash_flows:view_balance
    // (CashFlowsTable truyền null để tắt query) → phải optional-chaining, nếu
    // không sẽ throw TypeError ngay trong render phase → crash cả trang.
    enabled: !!filters?.startDate,
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
  });
}

export function useCashFlowSummary(filters: CashFlowQueryParams | null) {
  return useQuery({
    queryKey: ["cashflows", "summary", filters],
    queryFn: async (): Promise<
      Pick<CashFlowSummary, "totalReceipt" | "totalPayment">
    > => {
      const response = await apiClient.get(
        "/cashflows/summary",
        filters ?? undefined
      );
      return response as Pick<
        CashFlowSummary,
        "totalReceipt" | "totalPayment"
      >;
    },
    enabled: !!filters,
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Lỗi khi xuất dữ liệu"));
    } finally {
      setLoading(false);
    }
  };

  const exportOverview = async (filters: CashFlowQueryParams) => {
    const exportFilters = Object.fromEntries(
      Object.entries(filters).filter(
        ([key]) => key !== "pageSize" && key !== "currentItem"
      )
    );
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
