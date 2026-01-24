export interface PurchaseOrder {
  id: number;
  code: string;
  supplierId: number;
  branchId?: number;
  purchaseDate: string;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  shippingFee: number;
  otherFees: number;
  grandTotal: number;
  paidAmount: number;
  debtAmount: number;
  paymentStatus: string;
  status: number;
  statusValue?: string;
  description?: string;
  purchaseById?: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: number;
    code: string;
    name: string;
    contactNumber?: string;
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
  DRAFT: 1,
  CONFIRMED: 2,
  PARTIAL: 3,
  COMPLETED: 4,
  CANCELLED: 5,
} as const;

export const PURCHASE_ORDER_STATUS_LABELS = {
  [PURCHASE_ORDER_STATUS.DRAFT]: "Phiếu tạm",
  [PURCHASE_ORDER_STATUS.CONFIRMED]: "Đã xác nhận NCC",
  [PURCHASE_ORDER_STATUS.PARTIAL]: "Nhập một phần",
  [PURCHASE_ORDER_STATUS.COMPLETED]: "Hoàn thành",
  [PURCHASE_ORDER_STATUS.CANCELLED]: "Đã hủy",
} as const;
