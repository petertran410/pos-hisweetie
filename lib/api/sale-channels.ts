import { apiClient } from "@/lib/config/api";

export interface SaleChannel {
  id: number;
  name: string;
  position: number;
  isActivate: boolean;
}

export const saleChannelsApi = {
  getSaleChannels: (): Promise<SaleChannel[]> => {
    return apiClient.get("/sale-channels");
  },
};
