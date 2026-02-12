export const ORDER_STATUS = {
  PENDING: 1,
  CONFIRMED: 5,
  PROCESSING: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  PARTIALLY_INVOICED: 6,
} as const;

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: "Phiếu tạm",
  [ORDER_STATUS.CONFIRMED]: "Đã xác nhận",
  [ORDER_STATUS.PROCESSING]: "Đang giao hàng",
  [ORDER_STATUS.COMPLETED]: "Hoàn thành",
  [ORDER_STATUS.CANCELLED]: "Đã hủy",
  [ORDER_STATUS.PARTIALLY_INVOICED]: "Đã ra 1 phần hóa đơn",
} as const;

export const ORDER_STATUS_NUMBER_TO_STRING: Record<number, string> = {
  [ORDER_STATUS.PENDING]: "pending",
  [ORDER_STATUS.CONFIRMED]: "confirmed",
  [ORDER_STATUS.PROCESSING]: "processing",
  [ORDER_STATUS.COMPLETED]: "completed",
  [ORDER_STATUS.CANCELLED]: "cancelled",
  [ORDER_STATUS.PARTIALLY_INVOICED]: "partially_invoiced",
};

export interface Order {
  id: number;
  code: string;
  customerId?: number;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
  orderDate: string;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  grandTotal: number;
  paidAmount: number;
  debtAmount: number;
  depositAmount: number;
  paymentStatus: string;
  orderStatus: string;
  status: number;
  statusValue?: string;
  usingCod: boolean;
  description?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
    code?: string;
    contactNumber?: string;
    phone?: string;
    address?: string;
    cityName?: string;
    wardName?: string;
    birthDate?: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  soldBy?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  saleChannel?: {
    id: number;
    name: string;
  };
  items?: any[];
  payments?: any[];
  delivery?: {
    id: number;
    deliveryCode?: string;
    receiver?: string;
    contactNumber?: string;
    address?: string;
    locationName?: string;
    wardName?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    noteForDriver?: string;
    expectedDelivery?: string;
    partnerDelivery?: {
      id: number;
      name: string;
    };
  };
  invoices?: {
    id: number;
    code: string;
    orderId: number;
    customerId: number;
    branchId: number;
    soldById: null;
    saleChannelId: null;
    purchaseDate: string;
    totalAmount: string;
    discount: string;
    discountRatio: string;
    grandTotal: string;
    paidAmount: string;
    debtAmount: string;
    customerDebtSnapshot: string;
    status: number;
    statusValue: string;
    usingCod: boolean;
    description: "";
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    details?: Array<{
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
    }>;
  }[];
}
