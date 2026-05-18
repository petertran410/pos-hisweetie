import { apiClient } from "@/lib/config/api";
import type {
  SupplierReturn,
  SupplierReturnFilters,
} from "@/lib/types/supplier-return";

export interface SupplierReturnsResponse {
  data: SupplierReturn[];
  total: number;
  page: number;
  limit: number;
}

export interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  failed: number;
  errors: { code: string; error: string }[];
}

export const supplierReturnsApi = {
  getAll: (params?: SupplierReturnFilters): Promise<SupplierReturnsResponse> =>
    apiClient.get("/supplier-returns", params),

  getById: (id: number): Promise<SupplierReturn> =>
    apiClient.get(`/supplier-returns/${id}`),

  create: (data: any): Promise<SupplierReturn> =>
    apiClient.post("/supplier-returns", data),

  confirmExport: (id: number, data: any): Promise<SupplierReturn> =>
    apiClient.put(`/supplier-returns/${id}/confirm-export`, data),

  confirmRefund: (id: number, data: any): Promise<SupplierReturn> =>
    apiClient.put(`/supplier-returns/${id}/confirm-refund`, data),

  cancel: (id: number): Promise<SupplierReturn> =>
    apiClient.put(`/supplier-returns/${id}/cancel`, {}),

  updateStep1: (id: number, data: any): Promise<SupplierReturn> =>
    apiClient.put(`/supplier-returns/${id}/update-step1`, data),

  importFromExcel: (data: { items: any[] }): Promise<ImportResult> =>
    apiClient.post("/supplier-returns/import", data),
};
