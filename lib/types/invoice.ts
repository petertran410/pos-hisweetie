export interface Invoice {
  id: number;
  code: string;
  customerId?: number;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
  priceBookId?: number | null;
  priceBookName?: string | null;
  purchaseDate: string;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  grandTotal: number;
  paidAmount: number;
  debtAmount: number;
  status: number;
  statusValue?: string;
  usingCod: boolean;
  description?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  orderId?: number | null;
  order?: { id: number; code: string } | null;
  customer?: any;
  branch?: any;
  soldBy?: any;
  creator?: any;
  saleChannel?: any;
  details?: InvoiceDetail[];
  payments?: any[];
  delivery?: any;
}

export interface InvoiceDetail {
  id: number;
  invoiceId: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  discountRatio: number;
  totalPrice: number;
  note?: string;
  serialNumbers?: string;
  product?: any;
  conditionType?: string;
  // Khuyến mãi
  lineType?: string;
  isGift?: boolean;
  promotionId?: number | null;
  promotion?: { id: number; code: string; name: string } | null;
}

export const INVOICE_STATUS = {
  COMPLETED: 1,
  CANCELLED: 2,
  PROCESSING: 3,
  FAILED_DELIVERY: 4,
  PACKED: 5,
  LOADING: 6,
  DELIVERED: 7,
  RETURNED: 8,
} as const;

export const INVOICE_STATUS_LABELS: Record<number, string> = {
  1: "Hoàn thành",
  2: "Đã hủy",
  3: "Đang xử lý",
  4: "Không giao được",
  5: "Đóng hàng",
  6: "Đang giao hàng",
  7: "Giao thành công",
  8: "Trả hàng",
};

export const INVOICE_STATUS_NUMBER_TO_STRING: Record<number, string> = {
  1: "completed",
  2: "cancelled",
  3: "processing",
  4: "failed-delivery",
  5: "packed",
  6: "loading",
  7: "delivered",
  8: "returned",
};

export const INVOICE_STATUS_STRING_TO_NUMBER: Record<string, number> = {
  completed: 1,
  cancelled: 2,
  processing: 3,
  "failed-delivery": 4,
  packed: 5,
  loading: 6,
  delivered: 7,
  returned: 8,
};
