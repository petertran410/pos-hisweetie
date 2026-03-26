import { useQuery } from "@tanstack/react-query";
import { branchesApi } from "@/lib/api/branches";
import { useAuthStore } from "@/lib/store/auth";

export function useBranches() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["branches"],
    queryFn: branchesApi.getBranches,
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useMyBranches() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["my-branches"],
    queryFn: branchesApi.getMyBranches,
    enabled: hasHydrated && isAuthenticated,
  });
}
