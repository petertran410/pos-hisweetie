import { useQuery } from "@tanstack/react-query";
import { branchesApi } from "@/lib/api/branches";

export function useBranches() {
  return useQuery({
    queryKey: ["branches"],
    queryFn: branchesApi.getBranches,
  });
}

export function useMyBranches() {
  return useQuery({
    queryKey: ["my-branches"],
    queryFn: branchesApi.getMyBranches,
  });
}
