import { apiClient } from "@/lib/config/api";

export interface ConsignmentReturnDetail {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  consignedQuantity: number;
  returnQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  nearExpiryQuantity: number;
  manufactureDate?: string | null;
  note?: string | null;
}

export interface ConsignmentReturn {
  id: number;
  code: string;
  consignmentId: number;
  consignmentCode: string;
  customerId?: number | null;
  branchId: number;
  status: number;
  statusValue?: string | null;
  totalReturnQuantity: number;
  note?: string | null;
  createdAt: string;
  details: ConsignmentReturnDetail[];
}

export const consignmentReturnsApi = {
  getAll: (params?: any): Promise<{ data: ConsignmentReturn[]; total: number }> => {
    return apiClient.get("/consignment-returns", params);
  },

  getById: (id: number): Promise<ConsignmentReturn> => {
    return apiClient.get(`/consignment-returns/${id}`);
  },

  /** Số lượng còn có thể hoàn theo product: { [productId]: qty }. */
  getReturnable: (consignmentId: number): Promise<Record<number, number>> => {
    return apiClient.get(`/consignment-returns/returnable/${consignmentId}`);
  },

  create: (data: any): Promise<ConsignmentReturn> => {
    return apiClient.post("/consignment-returns", data);
  },

  confirmStock: (id: number): Promise<ConsignmentReturn> => {
    return apiClient.put(`/consignment-returns/${id}/confirm-stock`, {});
  },

  cancel: (id: number): Promise<ConsignmentReturn> => {
    return apiClient.put(`/consignment-returns/${id}/cancel`, {});
  },
};
