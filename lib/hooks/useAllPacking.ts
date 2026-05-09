import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { API_URL } from "../config/api";
import { useSandboxStore } from "@/lib/store/sandbox";
import { useSandboxDataStore } from "@/lib/store/sandbox-data";
import { sandboxQuery } from "@/lib/utils/sandbox-filters";

export function useAllPacking(params?: any) {
  const token = useAuthStore((state) => state.token);
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useQuery({
    queryKey: ["all-packing", params, isSandbox],
    queryFn: async () => {
      if (isSandbox) {
        const items = useSandboxDataStore.getState().getEntities("packings");
        // Filter theo type nếu có (giống API behavior)
        let filtered = items;
        if (params?.type) {
          filtered = items.filter((p: any) => p.type === params.type);
        }
        return sandboxQuery(filtered, params);
      }

      const queryParams = new URLSearchParams();
      if (params?.branchId) queryParams.append("branchId", params.branchId);
      if (params?.type) queryParams.append("type", params.type);
      if (params?.search) queryParams.append("search", params.search);
      if (params?.pageSize) queryParams.append("pageSize", params.pageSize);
      if (params?.currentItem)
        queryParams.append("currentItem", params.currentItem);

      const res = await fetch(
        `${API_URL}/all-packing?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch all packing");
      return res.json();
    },
  });
}
