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

  createTrademark: (data: {
    name: string;
    description?: string;
  }): Promise<TradeMark> => {
    return apiClient.post("/trademarks", data);
  },

  updateTrademark: (
    id: number,
    data: { name?: string; description?: string }
  ): Promise<TradeMark> => {
    return apiClient.put(`/trademarks/${id}`, data);
  },

  deleteTrademark: (id: number): Promise<void> => {
    return apiClient.delete(`/trademarks/${id}`);
  },
};
