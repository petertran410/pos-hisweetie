import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";

const API_URL = "http://localhost:3060/api";

export function useAllPacking(params?: any) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["all-packing", params],
    queryFn: async () => {
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
