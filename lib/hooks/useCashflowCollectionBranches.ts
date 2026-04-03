import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashflowCollectionBranchesApi } from "@/lib/api/cashflow-collection-branches";

export function useCollectionBranches() {
  return useQuery({
    queryKey: ["cashflow-collection-branches"],
    queryFn: () => cashflowCollectionBranchesApi.getAll(),
  });
}

export function useCreateCollectionBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cashflowCollectionBranchesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cashflow-collection-branches"],
      });
    },
  });
}
