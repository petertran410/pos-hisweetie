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
  /** Định mức tiêu hao chuẩn (L/100km), cho phép lệch ±FUEL_NORM_TOLERANCE. */
  fuelNorm: number | string | null;
  oilChangeIntervalKm: number | null;
  isActive: boolean;
  note: string | null;
  currentOdo: number | null;
  registrationDueAt: string | null;
  insuranceDueAt: string | null;
  lastOilChangeOdo: number | null;
  kmSinceOilChange: number | null;
  oilChangeDue: boolean;
  /** Tổng lít ÷ tổng km × 100 của các lần đổ trong FUEL_RECENT_MONTHS tháng gần nhất; null khi không có. */
  recentLitersPer100Km: number | null;
  recentFuelSamples: number;
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
  fuelNorm?: number | null;
  oilChangeIntervalKm?: number | null;
  note?: string | null;
}

export type VehicleUpdateInput = Partial<Omit<VehicleInput, "branchId">> & {
  isActive?: boolean;
};

/** Một dòng xe của báo cáo tổng hợp xăng dầu (khớp FuelSummaryRow ở backend). */
export interface VehicleFuelSummaryRow {
  vehicleId: number;
  branchId: number;
  label: string;
  plate: string;
  vehicleType: string;
  fuelType: string | null;
  isActive: boolean;
  /** Định mức quản lý kho đặt (L/100km). */
  fuelNorm: number | null;
  /** Tổng km đã đi trong kỳ (mỗi lần đổ: km tới lần đổ kế tiếp). */
  km: number | null;
  /** Tổng lít của các lần đổ đã tính km. */
  liters: number | null;
  litersPer100Km: number | null;
  samples: number;
  consumptionCheck: "NORMAL" | "ABNORMAL" | null;
  avgUnitPrice: number | null;
  currentUnitPrice: number | null;
  currentPriceAt: string | null;
  priceDiff: number | null;
  /** Chênh lệch đơn giá × (lít trong kỳ ÷ số tháng). */
  monthlyExtraCost: number | null;
}

export interface VehicleFuelSummaryTotal {
  vehicles: number;
  km: number | null;
  liters: number | null;
  litersPer100Km: number | null;
  avgUnitPrice: number | null;
  monthlyExtraCost: number | null;
}

export interface VehicleFuelSummary {
  from: string;
  to: string;
  months: number;
  tolerance: number;
  groups: Array<{
    branchId: number;
    branchName: string | null;
    rows: VehicleFuelSummaryRow[];
    total: VehicleFuelSummaryTotal;
  }>;
  total: VehicleFuelSummaryTotal;
}

export const vehiclesApi = {
  list: (params?: {
    branchId?: number;
    includeInactive?: boolean;
  }): Promise<Vehicle[]> =>
    apiClient.get("/vehicles", {
      branchId: params?.branchId,
      includeInactive: params?.includeInactive ? "true" : undefined,
    }),

  fuelSummary: (params?: { branchId?: number }): Promise<VehicleFuelSummary> =>
    apiClient.get("/vehicles/fuel-summary", { branchId: params?.branchId }),

  create: (payload: VehicleInput): Promise<Vehicle> =>
    apiClient.post("/vehicles", payload),

  update: (id: number, payload: VehicleUpdateInput): Promise<Vehicle> =>
    apiClient.patch(`/vehicles/${id}`, payload),
};
