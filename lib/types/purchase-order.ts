export interface PurchaseOrder {
  id: number;
  code: string;
  orderSupplierId?: number;
  supplierId: number;
  branchId?: number;
  purchaseDate: string;
  total: number;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  subTotal: number;
  paidAmount: number;
  debtAmount: number;
  status: number;
  statusValue?: string;
  supplierDebt: number;
  supplierOldDebt: number;
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
  // Số thứ tự dòng trong phiếu (1, 2, 3...). Cho phép cùng 1 sản phẩm
  // xuất hiện nhiều dòng (vd 1 dòng hàng thường + 1 dòng loại B). Nullable
  // vì row cũ (data trước migration) có thể chưa có giá trị.
  lineNumber?: number;
  // Phân loại hàng: "normal" (hàng thường, mặc định) hoặc "damaged" (loại B
  // = bục rách). Khi hoàn thành phiếu, phần "damaged" được cộng vào
  // Inventory.damagedQuantity (riêng, không ảnh hưởng tổng onHand).
  conditionType?: "normal" | "damaged";
  product?: {
    id: number;
    code: string;
    name: string;
    vat?: number;
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
  branchIds?: number[];
  supplierId?: number;
  supplierIds?: number[];
  status?: number;
  createdById?: number;
  purchaseById?: number;
  createdDateFrom?: string;
  createdDateTo?: string;
  pageSize?: number;
  currentItem?: number;
  search?: string;
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
