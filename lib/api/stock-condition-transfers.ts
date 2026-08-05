import { apiClient } from "@/lib/config/api";

export type ConditionBucket = "DAMAGED" | "NEAR_EXPIRY" | "PROMO";
export type TransferDirection = "IN" | "OUT";

export const BUCKET_LABELS: Record<ConditionBucket, string> = {
  DAMAGED: "Bục rách (loại B)",
  NEAR_EXPIRY: "Cận date",
  PROMO: "Khuyến mãi",
};

export const DIRECTION_LABELS: Record<TransferDirection, string> = {
  IN: "Chuyển vào (hàng tốt → loại)",
  OUT: "Điều chỉnh giảm (loại → hàng tốt)",
};

// 1=Chờ duyệt, 2=Đã duyệt, 3=Đã hủy
export const CLT_STATUS_LABELS: Record<number, string> = {
  1: "Chờ duyệt",
  2: "Đã duyệt",
  3: "Đã hủy",
};

export interface StockConditionTransferDetail {
  id: number;
  transferId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  toBucket: ConditionBucket;
  direction: TransferDirection;
  quantity: number;
  expiryDate?: string | null;
  currentOnHand: number;
  costAtTransfer: number;
  note?: string;
  product?: { id: number; code: string; name: string; unit?: string };
}

export interface StockConditionTransfer {
  id: number;
  code: string;
  branchId: number;
  branchName: string;
  status: number;
  transferDate: string;
  note?: string;
  createdById: number;
  createdByName: string;
  approvedById?: number | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  branch?: { id: number; name: string };
  creator?: { id: number; name: string };
  approver?: { id: number; name: string };
  details: StockConditionTransferDetail[];
}

export interface StockConditionTransfersResponse {
  data: StockConditionTransfer[];
  total: number;
  page: number;
  limit: number;
}

export interface StockConditionTransferQueryParams {
  search?: string;
  branchId?: number;
  branchIds?: string;
  status?: number;
  toBucket?: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  creatorId?: number;
  productId?: number;
}

export interface CreateStockConditionTransferItem {
  productId: number;
  toBucket: ConditionBucket;
  direction?: TransferDirection;
  quantity: number;
  expiryDate?: string;
  note?: string;
}

export interface CreateStockConditionTransferDto {
  branchId: number;
  transferDate?: string;
  note?: string;
  items: CreateStockConditionTransferItem[];
}

// ── Sửa phiếu (kể cả phiếu đã duyệt) ───────────────────────────────────────
// Chỉ cho sửa NSX, số lượng, ghi chú. Không đổi sản phẩm / loại tồn / chiều.
export interface UpdateStockConditionTransferItem {
  detailId: number;
  quantity?: number;
  /** null = xóa NSX (đưa về lô "chưa xác định NSX"). */
  expiryDate?: string | null;
  note?: string | null;
}

export interface UpdateStockConditionTransferDto {
  note?: string;
  items?: UpdateStockConditionTransferItem[];
  /**
   * true = đồng ý cập nhật cả soldExpiryDate của các hóa đơn đã bán từ lô cũ.
   * Bỏ trống → backend CHẶN nếu lô đang sửa đã phát sinh bán.
   */
  cascadeInvoices?: boolean;
}

export interface EditImpactInvoice {
  invoiceId: number;
  invoiceCode: string;
  purchaseDate?: string | null;
  quantity: number;
}

export interface EditImpactDetail {
  detailId: number;
  productCode: string;
  productName: string;
  currentExpiryDate?: string | null;
  soldQuantity: number;
  invoices: EditImpactInvoice[];
}

export interface EditImpactResponse {
  transferId: number;
  code: string;
  details: EditImpactDetail[];
}

export const stockConditionTransfersApi = {
  getAll: (
    params?: StockConditionTransferQueryParams
  ): Promise<StockConditionTransfersResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.branchIds) query.append("branchIds", params.branchIds);
    else if (params?.branchId)
      query.append("branchId", params.branchId.toString());
    if (params?.status) query.append("status", params.status.toString());
    if (params?.toBucket) query.append("toBucket", params.toBucket);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.fromDate) query.append("fromDate", params.fromDate);
    if (params?.toDate) query.append("toDate", params.toDate);
    if (params?.creatorId)
      query.append("creatorId", params.creatorId.toString());
    if (params?.productId)
      query.append("productId", params.productId.toString());
    return apiClient.get(`/stock-condition-transfers?${query.toString()}`);
  },

  getOne: (id: number): Promise<StockConditionTransfer> => {
    return apiClient.get(`/stock-condition-transfers/${id}`);
  },

  previewBalances: (
    data: {
      branchId: number;
      transferDate: string;
      items: Array<{
        productId: number;
        toBucket: ConditionBucket;
        expiryDate?: string | null;
      }>;
    }
  ): Promise<Record<string, number>> =>
    apiClient.post("/stock-condition-transfers/preview-balances", data),

  create: (
    data: CreateStockConditionTransferDto
  ): Promise<StockConditionTransfer> => {
    return apiClient.post("/stock-condition-transfers", data);
  },

  update: (
    id: number,
    data: UpdateStockConditionTransferDto
  ): Promise<StockConditionTransfer> => {
    return apiClient.put(`/stock-condition-transfers/${id}`, data);
  },

  getEditImpact: (id: number): Promise<EditImpactResponse> => {
    return apiClient.get(`/stock-condition-transfers/${id}/edit-impact`);
  },

  approve: (id: number): Promise<StockConditionTransfer> => {
    return apiClient.put(`/stock-condition-transfers/${id}/approve`);
  },

  cancel: (id: number): Promise<StockConditionTransfer> => {
    return apiClient.put(`/stock-condition-transfers/${id}/cancel`);
  },
};
