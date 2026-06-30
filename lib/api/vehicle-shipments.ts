import { apiClient, API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import type {
  VehicleShipment,
  VehicleShipmentFilters,
  VehicleShipmentItemInput,
  AvailableOrderSupplier,
  CreatePOFromVehicleSection,
  VehicleFile,
} from "../types/vehicle-shipment";

export const vehicleShipmentsApi = {
  getAll: (params?: VehicleShipmentFilters) =>
    apiClient.get<{
      data: VehicleShipment[];
      total: number;
      pageSize: number;
      currentItem: number;
    }>("/vehicle-shipments", params),

  getById: (id: number) =>
    apiClient.get<VehicleShipment>(`/vehicle-shipments/${id}`),

  getAvailableItems: (branchId?: number) =>
    apiClient.get<AvailableOrderSupplier[]>(
      "/vehicle-shipments/available-items",
      branchId ? { branchId } : undefined
    ),

  getContractNos: () =>
    apiClient.get<string[]>("/vehicle-shipments/contract-nos"),

  create: (data: {
    code?: string;
    branchId?: number;
    borderGateId?: number;
    vehicleInfo?: string;
    description?: string;
    status?: number;
    files?: VehicleFile[];
    expectedArrivalDate?: string;
    items: VehicleShipmentItemInput[];
  }) => apiClient.post<VehicleShipment>("/vehicle-shipments", data),

  update: (
    id: number,
    data: {
      code?: string;
      branchId?: number;
      borderGateId?: number;
      vehicleInfo?: string;
      description?: string;
      status?: number;
      files?: VehicleFile[];
      expectedArrivalDate?: string;
      items?: VehicleShipmentItemInput[];
    }
  ) => apiClient.put<VehicleShipment>(`/vehicle-shipments/${id}`, data),

  cancel: (id: number) =>
    apiClient.put<VehicleShipment>(`/vehicle-shipments/${id}/cancel`, {}),

  createPurchaseOrders: (
    id: number,
    sections: CreatePOFromVehicleSection[]
  ) =>
    apiClient.post(`/vehicle-shipments/${id}/create-purchase-orders`, {
      sections,
    }),

  resolveItem: (
    id: number,
    payload: {
      vehicleShipmentItemId: number;
      action: string;
    }
  ) => apiClient.put(`/vehicle-shipments/${id}/resolve-item`, payload),

  /** Upload nhiều file vào folder riêng của ghép xe. */
  uploadFiles: async (
    files: File[]
  ): Promise<{
    items: VehicleFile[];
    errors: { originalname: string; reason: string }[];
  }> => {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch(
      `${API_URL}/upload/files?subfolder=vehicle-shipments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    if (!res.ok) throw new Error("Upload file thất bại");
    const result = await res.json();
    return { items: result.items ?? [], errors: result.errors ?? [] };
  },
};
