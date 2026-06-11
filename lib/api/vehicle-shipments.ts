import { apiClient } from "@/lib/config/api";
import type {
  VehicleShipment,
  VehicleShipmentFilters,
  VehicleShipmentItemInput,
  AvailableOrderSupplier,
  CreatePOFromVehicleSection,
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

  create: (data: {
    code?: string;
    branchId?: number;
    vehicleInfo?: string;
    description?: string;
    status?: number;
    items: VehicleShipmentItemInput[];
  }) => apiClient.post<VehicleShipment>("/vehicle-shipments", data),

  update: (
    id: number,
    data: {
      code?: string;
      branchId?: number;
      vehicleInfo?: string;
      description?: string;
      status?: number;
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
    payload: { orderSupplierId: number; productId: number; action: string }
  ) => apiClient.put(`/vehicle-shipments/${id}/resolve-item`, payload),
};
