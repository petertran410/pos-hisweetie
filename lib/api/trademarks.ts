import { apiClient } from "@/lib/config/api";

export interface TradeMark {
  id: number;
  name: string;
  description?: string;
}

export const trademarksApi = {
  getTrademarks: (): Promise<TradeMark[]> => {
    return apiClient.get("/trademarks");
  },
};
