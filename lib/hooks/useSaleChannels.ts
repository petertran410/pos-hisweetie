import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/config/api";

export interface SaleChannel {
  id: number;
  name: string;
  position: number;
  isActivate: boolean;
}

export function useSaleChannels() {
  return useQuery({
    queryKey: ["sale-channels"],
    queryFn: async () => {
      const response = await apiClient.get<SaleChannel[]>("/sale-channels");
      return response;
    },
  });
}
