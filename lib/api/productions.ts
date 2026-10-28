import { apiClient } from "@/lib/config/api";

export interface SavedProductionComponent {
  id: number;
  componentProductId: number;
  componentCode: string;
  componentName: string;
  formulaGrams: number;
  actualGrams: number;
  unitsDeducted: number;
  inputMode?: string | null;
}

export interface Production {
  id: number;
  code: string;
  sourceBranchId: number;
  sourceBranchName: string;
  destinationBranchId: number;
  destinationBranchName: string;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  totalCost: number;
  note?: string;
  status: number;
  createdById: number;
  createdByName: string;
  autoDeductComponents: boolean;
  manufacturedDate?: string;
  formulaId?: number | null;
  formulaName?: string | null;
  createdAt: string;
  updatedAt: string;
  components?: SavedProductionComponent[];

  // ── Gửi sản xuất ở nhà máy ngoài ──
  // Phiếu gửi: 1 Phiếu tạm → 4 Đã gửi → 2 Hoàn thành; 3 Đã hủy.
  isExternal?: boolean;
  factoryId?: number | null;
  supplierId?: number | null;
  factory?: { id: number; code?: string | null; name: string } | null;
  supplier?: { id: number; code?: string | null; name: string } | null;
  /** Phí sản xuất cả lô, quy VND. */
  processingFee?: number | string;
  feeCurrency?: "VND" | "CNY";
  feeForeignAmount?: number | string | null;
  feeExchangeRate?: number | string | null;
  /** Giá vốn nguyên liệu đã gửi = giá trị hàng NCC đang giữ (không phải nợ). */
  materialValue?: number | string;
  receivedQuantity?: number | string | null;
  sentDate?: string | null;
  completedDate?: string | null;
  costAppliedAt?: string | null;
  appliedUnitCost?: number | string | null;
}

/** Giá thành + giá vốn bình quân đề xuất của phiếu gửi sản xuất. */
export interface ProductionCostPreview {
  productionId: number;
  productName: string;
  receiveBranchId: number;
  receiveBranchName: string;
  materialValue: number;
  processingFee: number;
  totalCost: number;
  receivedQuantity: number;
  unitCost: number;
  onHand: number;
  oldCost: number;
  otherQuantity: number;
  proposedCost: number;
  branchCount: number;
  applied: boolean;
  appliedUnitCost: number | null;
}

export interface ProductionComponentData {
  componentProductId: number;
  formulaGrams: number;
  actualGrams: number;
}

export interface ProductionQueryParams {
  branchIds?: number[];
  status?: number[];
  fromManufacturedDate?: string;
  toManufacturedDate?: string;
  pageSize?: number;
  currentItem?: number;
  search?: string;
  isExternal?: boolean;
}

export interface CreateProductionData {
  code?: string;
  sourceBranchId: number;
  destinationBranchId: number;
  productId: number;
  quantity: number;
  note?: string;
  status?: number;
  manufacturedDate?: string;
  autoDeductComponents?: boolean;
  components?: ProductionComponentData[];
  formulaId?: number;
  // Gửi sản xuất ở nhà máy ngoài
  isExternal?: boolean;
  factoryId?: number | null;
  supplierId?: number;
  feeCurrency?: "VND" | "CNY";
  processingFee?: number;
  feeForeignAmount?: number;
  feeExchangeRate?: number;
}

export const productionsApi = {
  getAll: (params?: ProductionQueryParams) =>
    apiClient.get<{ total: number; pageSize: number; data: Production[] }>(
      "/productions",
      params
    ),

  getById: (id: number) => apiClient.get<Production>(`/productions/${id}`),

  create: (data: CreateProductionData) =>
    apiClient.post<Production>("/productions", data),

  update: (id: number, data: Partial<CreateProductionData>) =>
    apiClient.put<Production>(`/productions/${id}`, data),

  delete: (id: number) => apiClient.delete(`/productions/${id}`),

  // ── Gửi sản xuất ở nhà máy ngoài ──
  send: (
    id: number,
    data: { sentDate?: string; components?: ProductionComponentData[] },
  ) => apiClient.post<Production>(`/productions/${id}/send`, data),

  receive: (
    id: number,
    data: {
      completedDate?: string;
      receivedQuantity?: number;
      newCost?: number;
      costScope?: "receiveBranch" | "allBranches";
    },
  ) => apiClient.post<Production>(`/productions/${id}/receive`, data),

  getCostPreview: (id: number, receivedQuantity?: number) =>
    apiClient.get<ProductionCostPreview>(`/productions/${id}/cost-preview`, {
      receivedQuantity,
    }),

  applyCost: (
    id: number,
    data: {
      newCost: number;
      scope?: "receiveBranch" | "allBranches";
      expectedOldCost?: number;
    },
  ) => apiClient.post<Production>(`/productions/${id}/apply-cost`, data),

  cancelSent: (id: number, data: { reason?: string }) =>
    apiClient.post<Production>(`/productions/${id}/cancel-sent`, data),
};
