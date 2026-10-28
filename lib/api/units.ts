import { apiClient } from "../config/api";

/** Mã đơn vị hệ thống "Thùng" — logic nhận theo mã, không so chữ. */
export const CARTON_UNIT_CODE = "CARTON";

export interface Unit {
  id: number;
  name: string;
  code?: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  /** Số sản phẩm đang dùng đơn vị này. */
  productCount: number;
}

export const unitsApi = {
  getAll: (includeInactive = false): Promise<Unit[]> =>
    apiClient.get("/units", includeInactive ? { includeInactive: "true" } : {}),

  create: (name: string): Promise<Unit> => apiClient.post("/units", { name }),

  update: (
    id: number,
    data: { name?: string; isActive?: boolean; confirmMerge?: boolean },
  ): Promise<Unit> => apiClient.put(`/units/${id}`, data),

  remove: (id: number) => apiClient.delete(`/units/${id}`),

  reorder: (ids: number[]): Promise<Unit[]> =>
    apiClient.put("/units/reorder", { ids }),
};

/** Khóa so sánh tên đơn vị: NFC, gộp khoảng trắng, không phân biệt hoa/thường. */
export const normalizeUnitKey = (value?: string | null) =>
  (value ?? "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
