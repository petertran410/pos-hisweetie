import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";
import { apiClient } from "@/lib/config/api";
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
