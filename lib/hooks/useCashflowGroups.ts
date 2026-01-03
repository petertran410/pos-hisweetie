import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashflowGroupsApi } from "@/lib/api/cashflow-groups";

export function useCashFlowGroups(isReceipt?: boolean) {
  return useQuery({
    queryKey: ["cashflow-groups", isReceipt],
    queryFn: () => cashflowGroupsApi.getCashFlowGroups(isReceipt),
  });
}

export function useCreateCashFlowGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cashflowGroupsApi.createCashFlowGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflow-groups"] });
    },
  });
}
