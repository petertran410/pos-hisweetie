export interface SupplierReturnDetail {
  id: number;
  supplierReturnId: number;
  purchaseOrderId?: number;
  purchaseOrderCode?: string;
  productId: number;
  productCode: string;
  productName: string;
  purchaseQuantity: number;
  purchasePrice: number;
  requestQuantity: number;
  confirmedQuantity: number;
  returnPrice: number;
  totalAmount: number;
  note?: string;
  product?: {
    id: number;
    code: string;
    name: string;
    images?: string;
  };
}

export interface SupplierReturn {
  id: number;
  code: string;
  mode: "by_purchase_order" | "by_product";
  purchaseOrderId?: number;
  supplierId: number;
  branchId: number;
  status: number;
  statusValue?: string;
  totalReturnAmount: number;
  refundAmount: number;
  refundType?: string;
  refundedAmount: number;
  note?: string;
  exportedById?: number;
  exportedByName?: string;
  exportedAt?: string;
  refundConfirmedBy?: number;
  refundConfirmedByName?: string;
  refundConfirmedAt?: string;
  cashFlowId?: number;
  createdBy: number;
  createdByName?: string;
  images?: string;
  createdAt: string;
  updatedAt: string;
  purchaseOrder?: { id: number; code: string };
  supplier?: { id: number; code: string; name: string };
  branch?: { id: number; name: string; isActive: boolean };
  creator?: { id: number; name: string };
  exporter?: { id: number; name: string };
  refundConfirmer?: { id: number; name: string };
  cashFlow?: { id: number; code: string; amount: number };
  details?: SupplierReturnDetail[];
}

export interface SupplierReturnFilters {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: number;
  branchId?: number;
  status?: number;
  mode?: string;
  refundType?: string;
  fromDate?: string;
  toDate?: string;
  createdBy?: number;
}

export const SUPPLIER_RETURN_STATUS = {
  REQUEST: 1,
  STOCK_EXPORTED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  DRAFT: 5,
  STOCK_EXPORT_DRAFT: 6,
} as const;

export const SUPPLIER_RETURN_STATUS_LABELS: Record<number, string> = {
  1: "Yêu cầu trả hàng nhập",
  2: "Đã xuất kho",
  3: "Hoàn thành",
  4: "Đã hủy",
  5: "Phiếu tạm",
  6: "Đang xuất kho (tạm)",
};
