import { apiClient } from "@/lib/config/api";

export const packingSlipsApi = {
  getPackingSlips: (params?: any) => {
    return apiClient.get("/packing-slips", params);
  },

  getPackingSlip: (id: number) => {
    return apiClient.get(`/packing-slips/${id}`);
  },

  createPackingSlip: (data: any) => {
    return apiClient.post("/packing-slips", data);
  },

  updatePackingSlip: (id: number, data: any) => {
    return apiClient.put(`/packing-slips/${id}`, data);
  },

  deletePackingSlip: (id: number) => {
    return apiClient.delete(`/packing-slips/${id}`);
  },
};
