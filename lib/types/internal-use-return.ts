export const INTERNAL_USE_RETURN_STATUS = {
  REQUEST: 1,
  STOCK_RECEIVED: 2,
  CANCELLED: 3,
  REQUEST_DRAFT: 4,
  STOCK_DRAFT: 5,
} as const;

export const INTERNAL_USE_RETURN_STATUS_LABELS: Record<number, string> = {
  [INTERNAL_USE_RETURN_STATUS.REQUEST]: "Chờ nhận hàng",
  [INTERNAL_USE_RETURN_STATUS.STOCK_RECEIVED]: "Đã nhập lại kho",
  [INTERNAL_USE_RETURN_STATUS.CANCELLED]: "Đã hủy",
  [INTERNAL_USE_RETURN_STATUS.REQUEST_DRAFT]: "Phiếu tạm",
  [INTERNAL_USE_RETURN_STATUS.STOCK_DRAFT]: "Đang nhập hàng (tạm)",
};

export interface InternalUseReturnDetail {
  id: number;
  internalUseReturnId: number;
  internalUseDetailId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  issuedQuantity: number;
  sourceConditionType: "normal" | "damaged" | "near_expiry";
  sourceSoldExpiryDate?: string | null;
  requestQuantity: number;
  confirmedQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  nearExpiryQuantity: number;
  nearExpiryDate?: string | null;
  note?: string | null;
}

export interface InternalUseReturn {
  id: number;
  code: string;
  internalUseId: number;
  branchId: number;
  status: number;
  statusValue?: string | null;
  totalRequestQuantity: number;
  totalConfirmedQuantity: number;
  note?: string | null;
  createdBy: number;
  createdByName?: string | null;
  receivedById?: number | null;
  receivedByName?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  internalUse?: { id: number; code: string };
  branch?: { id: number; name: string };
  creator?: { id: number; name: string };
  receivedBy?: { id: number; name: string };
  details?: InternalUseReturnDetail[];
}

export interface InternalUseReturnableDetail {
  internalUseDetailId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  issuedQuantity: number;
  remainingQuantity: number;
  conditionType: "normal" | "damaged" | "near_expiry";
  soldExpiryDate?: string | null;
}

export interface InternalUseReturnable {
  internalUseId: number;
  internalUseCode: string;
  branchId: number;
  branchName: string;
  details: InternalUseReturnableDetail[];
}

