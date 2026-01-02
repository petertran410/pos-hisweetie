import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashflowsApi } from "@/lib/api/cashflows";

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
