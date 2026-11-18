import { apiClient } from "@/lib/config/api";
import type { ManufacturerMaterial, OwnMaterial } from "./manufacturers";

export interface SavedProductionComponent {
  unit?: string | null;
  conversionFactor?: number | string | null;
  unitCost?: number | string | null;
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
  manufacturerId?: number | null;
  manufacturer?: { id: number; code: string; name: string; supplierId?: number | null } | null;
  manufacturerMaterials?: ManufacturerMaterial[];
  externalTemplateId?: number | null;
  externalTemplateName?: string | null;
  manufacturerMaterialCost?: number | string;
  totalPayable?: number | string;
  paidAmount?: number | string;
  debtAmount?: number | string;
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
  // Phiếu gửi: 1 Phiếu tạm → 4 Đã gửi → 5 Nhận một phần → 2 Hoàn thành; 3 Đã hủy.
  isExternal?: boolean;
  /** Phiếu gửi NSX: đã "Kết thúc nhận hàng" khi chưa nhận đủ. */
  receivingClosed?: boolean;
  /** Đợt nhận thành phẩm (cả đợt đã hủy), theo thứ tự. */
  receipts?: ProductionReceipt[];
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
  batchUnitCost?: number | string | null;
  outputSpecSnapshot?: {
    unit: string | null;
    weight: string | null;
    weightUnit: string | null;
    conversionValue: string;
    masterUnitId: number | null;
    isPieceUnit: boolean;
  } | null;
  costSnapshotAt?: string | null;
  costAppliedById?: number | null;
  costAppliedByName?: string | null;
  costAppliedScope?: "receiveBranch" | "allBranches" | null;
  costApplicationSnapshot?: { basis: string; changes: Array<{ branchId: number; before: string; after: string }> } | null;
  /** Phiếu nhập nhận thành phẩm còn hiệu lực (tạm hoặc đã nhập), mới nhất trước. */
  purchaseOrders?: ProductionPurchaseOrder[];
}

/** Đợt nhận thành phẩm của phiếu gửi NSX (status 1 hiệu lực, 2 đã hủy). */
export interface ProductionReceipt {
  id: number;
  productionId: number;
  seq: number;
  code: string;
  status: number;
  receivedDate: string;
  quantity: number | string;
  note?: string | null;
  /** Phí gia công của đợt, quy VND. */
  processingFee: number | string;
  feeForeignAmount?: number | string | null;
  feeExchangeRate?: number | string | null;
  manufacturerMaterialCost: number | string;
  totalPayable: number | string;
  totalForeignPayable?: number | string | null;
  manufacturerMaterials: ManufacturerMaterial[];
  createdByName: string;
  updatedByName?: string | null;
  cancelledAt?: string | null;
  cancelledByName?: string | null;
  createdAt: string;
}

/** Dữ liệu nhận / sửa một đợt (phiếu gửi NSX). */
export interface ProductionReceiptData {
  completedDate?: string;
  receivedQuantity?: number;
  processingFee?: number;
  manufacturerMaterials?: ManufacturerMaterial[];
  feeForeignAmount?: number;
  feeExchangeRate?: number;
  /** Đợt cuối — hoàn tất phiếu dù chưa nhận đủ dự kiến. */
  finish?: boolean;
  note?: string;
}

/** PN nhận hàng của phiếu Gửi sản xuất (PN status: 0 tạm, 1 đã nhập, 2 hủy). */
export interface ProductionPurchaseOrder {
  id: number;
  code: string;
  status: number;
  isDraft: boolean;
}

/** Giá thành + giá vốn bình quân đề xuất của phiếu gửi sản xuất. */
export interface ProductionCostPreview {
  manufacturerMaterialCost?: number;
  totalPayable?: number;
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
  manufacturerIds?: number[];
  branchIds?: number[];
  status?: number[];
  fromManufacturedDate?: string;
  toManufacturedDate?: string;
  pageSize?: number;
  currentItem?: number;
  search?: string;
  isExternal?: boolean;
  fromCreatedDate?: string;
  toCreatedDate?: string;
  factoryIds?: number[];
  supplierIds?: number[];
  createdByIds?: number[];
  productId?: number;
  componentProductId?: number;
}

export interface CreateProductionData {
  manufacturerId?: number;
  ownMaterials?: OwnMaterial[];
  manufacturerMaterials?: ManufacturerMaterial[];
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
  // Phiếu gửi NSX: công thức gửi đi đã nạp (null = nhập tay).
  formulaId?: number | null;
  // Gửi sản xuất ở nhà máy ngoài
  isExternal?: boolean;
  factoryId?: number | null;
  supplierId?: number;
  feeCurrency?: "VND" | "CNY";
  processingFee?: number;
  feeForeignAmount?: number;
  feeExchangeRate?: number;
  /** Phiếu gửi NSX đã gửi: sửa ngày gửi (ngày ghi xuất kho nguyên liệu). */
  sentDate?: string;
}

export interface ProductionCostHistoryQuery {
  productId: number;
  manufacturerId?: number;
  fromDate?: string;
  toDate?: string;
  variantKey?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductionCostHistoryRow {
  id: number;
  code: string;
  productId: number;
  productCode: string;
  productName: string;
  manufacturerId: number;
  manufacturerName: string;
  completedDate: string;
  externalTemplateName: string | null;
  formulaName?: string | null;
  receivedQuantity: number;
  materialValue: number;
  manufacturerMaterialCost: number;
  processingFee: number;
  totalCost: number;
  unitCost: number | null;
  /** Toàn bộ chi phí / tổng đã nhận (so với giá thành dự kiến đã áp). */
  actualUnitCost?: number | null;
  variantKey: string;
  variantLabel: string;
  snapshotMissing: boolean;
  canApply: boolean;
  deltaAmount: number | null;
  deltaPercent: number | null;
  previousProductionId: number | null;
  costAppliedAt: string | null;
  costAppliedByName: string | null;
  costAppliedScope: string | null;
}

export interface ProductionCostHistoryResponse {
  data: ProductionCostHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
  variants: Array<{ key: string; label: string }>;
}

export interface CostApplicationPreview {
  productionId: number;
  code: string;
  productName: string;
  scope: "receiveBranch" | "allBranches";
  unitCost: number;
  variantLabel: string;
  targets: Array<{ branchId: number; branchName: string; cost: number; delta: number }>;
}

export const productionsApi = {
  costHistory: (query: ProductionCostHistoryQuery, chart = false) =>
    apiClient.get<ProductionCostHistoryResponse>(`/productions/cost-history${chart ? "/chart" : ""}`, query),

  costApplicationPreview: (id: number, scope: "receiveBranch" | "allBranches") =>
    apiClient.get<CostApplicationPreview>(`/productions/${id}/cost-application-preview`, { scope }),
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
      expectedOldCost?: number;
      expectedCosts?: Array<{ branchId: number; cost: number }>;
      // Phí chốt = giá trị phiếu nhập được tạo.
      processingFee?: number;
      manufacturerMaterials?: ManufacturerMaterial[];
      feeForeignAmount?: number;
      feeExchangeRate?: number;
      finish?: boolean;
      note?: string;
    },
  ) => apiClient.post<Production>(`/productions/${id}/receive`, data),

  // ── Đợt nhận của phiếu gửi NSX ──
  updateReceipt: (id: number, receiptId: number, data: ProductionReceiptData) =>
    apiClient.put<Production>(`/productions/${id}/receipts/${receiptId}`, data),

  cancelReceipt: (id: number, receiptId: number) =>
    apiClient.post<Production>(
      `/productions/${id}/receipts/${receiptId}/cancel`,
      {},
    ),

  closeReceiving: (id: number) =>
    apiClient.post<Production>(`/productions/${id}/close-receiving`, {}),

  reopenReceiving: (id: number) =>
    apiClient.post<Production>(`/productions/${id}/reopen-receiving`, {}),

  getCostPreview: (
    id: number,
    receivedQuantity?: number,
    processingFee?: number,
  ) =>
    apiClient.get<ProductionCostPreview>(`/productions/${id}/cost-preview`, {
      receivedQuantity,
      processingFee,
    }),

  applyCost: (
    id: number,
    data: {
      basis?: "batch";
      newCost?: number;
      scope?: "receiveBranch" | "allBranches";
      expectedOldCost?: number;
      expectedCosts?: Array<{ branchId: number; cost: number }>;
    },
  ) => apiClient.post<Production>(`/productions/${id}/apply-cost`, data),

  cancelSent: (id: number, data: { reason?: string }) =>
    apiClient.post<Production>(`/productions/${id}/cancel-sent`, data),
};
