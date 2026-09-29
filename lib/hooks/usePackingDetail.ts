import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../config/api";

export type PackingItemType = "giao-hang" | "dong-hang" | "loading";

export function getPackingDetailEndpoint(type: PackingItemType, id: number) {
  if (type === "dong-hang") return `/packing-hangs/${id}`;
  if (type === "loading") return `/packing-loadings/${id}`;
  return `/packing-slips/${id}`;
}

export function usePackingDetail(
  type: PackingItemType,
  id: number,
  placeholderData?: any,
  enabled = true
) {
  return useQuery({
    queryKey: ["packing-detail", type, id],
    queryFn: () =>
      apiClient.get<any>(getPackingDetailEndpoint(type, id)),
    enabled: enabled && id > 0,
    placeholderData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}
