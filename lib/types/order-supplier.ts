export interface OrderSupplier {
  id: number;
  code: string;
  orderDate: string;
  branchId?: number;
  supplierId: number;
  userId?: number;
  description?: string;
  status: number;
  statusValue?: string;
  discount: number;
  discountRatio: number;
  productQty: number;
  total: number;
  subTotal: number;
  totalAmt: number;
  totalQty: number;
  totalQuantity: number;
  paidAmount: number;
  exReturnSuppliers: number;
  exReturnThirdParty: number;
  toComplete: boolean;
  viewPrice: boolean;
  supplierDebt: number;
  supplierOldDebt: number;
  expectedDeliveryDate?: string;
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
  expensesOthers?: OrderSupplierExpensesOther[];
  purchaseOrders?: Array<{
    id: number;
    code: string;
    purchaseDate: string;
    total: number;
    items?: Array<{
      productId: number;
      quantity: number;
    }>;
  }>;
  payments?: OrderSupplierPayment[];
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
  allocation: number;
  allocationSuppliers: number;
  allocationThirdParty: number;
  orderQuantity: number;
  subTotal: number;
  description?: string;
  orderByNumber?: number;
}

export interface OrderSupplierExpensesOther {
  id: number;
  orderSupplierId: number;
  expensesOtherId?: number;
  expensesOtherCode: string;
  expensesOtherName: string;
  form?: number;
  expensesOtherOrder?: number;
  price: number;
  exValue?: number;
  isReturnAuto: boolean;
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

export interface OrderSupplierPayment {
  id: number;
  code: string;
  orderSupplierId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  accountId?: number;
  description?: string;
  status: number;
  statusValue?: string;
}

export const ORDER_SUPPLIER_STATUS = {
  DRAFT: 0,
  CONFIRMED: 1,
  PARTIAL: 2,
  COMPLETED: 3,
  CANCELLED: 4,
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
