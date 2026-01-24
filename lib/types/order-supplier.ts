export interface OrderSupplier {
  id: number;
  code: string;
  supplierId: number;
  branchId?: number;
  orderDate: string;
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
  userId?: number;
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
  user?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  items?: OrderSupplierItem[];
}

export interface OrderSupplierItem {
  id: number;
  orderSupplierId: number;
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

export interface OrderSupplierFilters {
  branchId?: number;
  supplierId?: number;
  status?: number;
  createdById?: number;
  userId?: number;
  createdDateFrom?: string;
  createdDateTo?: string;
  pageSize?: number;
  currentItem?: number;
}

export const ORDER_SUPPLIER_STATUS = {
  DRAFT: 1,
  CONFIRMED: 2,
  PARTIAL: 3,
  COMPLETED: 4,
  CANCELLED: 5,
} as const;

export const ORDER_SUPPLIER_STATUS_LABELS: Record<number, string> = {
  [ORDER_SUPPLIER_STATUS.DRAFT]: "Phiếu tạm",
  [ORDER_SUPPLIER_STATUS.CONFIRMED]: "Đã xác nhận NCC",
  [ORDER_SUPPLIER_STATUS.PARTIAL]: "Nhập một phần",
  [ORDER_SUPPLIER_STATUS.COMPLETED]: "Hoàn thành",
  [ORDER_SUPPLIER_STATUS.CANCELLED]: "Đã hủy",
};

export function getStatusLabel(status: number): string {
  return ORDER_SUPPLIER_STATUS_LABELS[status] || "Không xác định";
}
