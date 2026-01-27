export interface PurchaseOrder {
  id: number;
  code: string;
  orderSupplierId?: number;
  supplierId: number;
  branchId?: number;
  purchaseDate: string;
  total: number;
  discount: number;
  discountRatio: number;
  paidAmount: number;
  isDraft: boolean;
  partnerType?: string;
  description?: string;
  purchaseById?: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  orderSupplier?: {
    id: number;
    code: string;
  };
  supplier?: {
    id: number;
    code: string;
    name: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  purchaseBy?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  items?: PurchaseOrderItem[];
  payments?: PurchaseOrderPayment[];
  surcharges?: PurchaseOrderSurcharge[];
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  discountRatio: number;
  totalPrice: number;
  description?: string;
  serialNumbers?: string;
  product?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface PurchaseOrderPayment {
  id: number;
  code: string;
  purchaseOrderId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  accountId?: number;
  description?: string;
  status: number;
  statusValue?: string;
}

export interface PurchaseOrderSurcharge {
  id: number;
  purchaseOrderId: number;
  code: string;
  name: string;
  value?: number;
  valueRatio?: number;
  isSupplierExpense: boolean;
  type: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderFilters {
  branchId?: number;
  supplierId?: number;
  status?: number;
  createdById?: number;
  purchaseById?: number;
  createdDateFrom?: string;
  createdDateTo?: string;
  pageSize?: number;
  currentItem?: number;
}

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 0,
  COMPLETED: 1,
  CANCELLED: 2,
} as const;

export const PURCHASE_ORDER_STATUS_LABELS: Record<number, string> = {
  [PURCHASE_ORDER_STATUS.DRAFT]: "Phiếu tạm",
  [PURCHASE_ORDER_STATUS.COMPLETED]: "Đã nhập hàng",
  [PURCHASE_ORDER_STATUS.CANCELLED]: "Đã hủy",
};

export function getStatusLabel(status: number): string {
  return PURCHASE_ORDER_STATUS_LABELS[status] || "Không xác định";
}
