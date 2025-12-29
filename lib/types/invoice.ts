export interface Invoice {
  id: number;
  code: string;
  customerId?: number;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
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
}

export const INVOICE_STATUS = {
  COMPLETED: 1,
  CANCELLED: 2,
  PROCESSING: 3,
  FAILED_DELIVERY: 4,
} as const;

export const INVOICE_STATUS_NUMBER_TO_STRING: Record<number, string> = {
  1: "completed",
  2: "cancelled",
  3: "processing",
  4: "failed-delivery",
};

export const INVOICE_STATUS_STRING_TO_NUMBER: Record<string, number> = {
  completed: 1,
  cancelled: 2,
  processing: 3,
  "failed-delivery": 4,
};
