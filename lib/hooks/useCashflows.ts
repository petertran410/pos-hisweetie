import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";
import { apiClient } from "@/lib/config/api";

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
    },
  });
}

export function useCancelCashFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cashflowsApi.cancelCashFlow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
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
