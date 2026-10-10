import { apiClient } from "@/lib/config/api";

export interface Vehicle {
  id: number;
  branchId: number;
  branch?: { id: number; name: string } | null;
  label: string;
  plate: string;
  vehicleType: string;
  fuelType: string | null;
  driverId: number | null;
  driver?: { id: number; name: string } | null;
  costPerKmMin: number | string | null;
  costPerKmMax: number | string | null;
  oilChangeIntervalKm: number | null;
  isActive: boolean;
  note: string | null;
  currentOdo: number | null;
  registrationDueAt: string | null;
  insuranceDueAt: string | null;
  lastOilChangeOdo: number | null;
  kmSinceOilChange: number | null;
  oilChangeDue: boolean;
}

export interface VehicleInput {
  branchId: number;
  label: string;
  plate: string;
  vehicleType?: string;
  fuelType?: string | null;
  driverId?: number | null;
  costPerKmMin?: number | null;
  costPerKmMax?: number | null;
  oilChangeIntervalKm?: number | null;
  note?: string | null;
}

export type VehicleUpdateInput = Partial<Omit<VehicleInput, "branchId">> & {
  isActive?: boolean;
};

export const vehiclesApi = {
  list: (params?: {
    branchId?: number;
    includeInactive?: boolean;
  }): Promise<Vehicle[]> =>
    apiClient.get("/vehicles", {
      branchId: params?.branchId,
      includeInactive: params?.includeInactive ? "true" : undefined,
    }),

  create: (payload: VehicleInput): Promise<Vehicle> =>
    apiClient.post("/vehicles", payload),

  update: (id: number, payload: VehicleUpdateInput): Promise<Vehicle> =>
    apiClient.patch(`/vehicles/${id}`, payload),
};
