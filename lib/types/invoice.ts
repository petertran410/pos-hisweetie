import type { DebtRuleType } from "@/lib/api/debt-tracking";
import type { CustomerAddress } from "@/lib/types/customer";

export interface InvoiceCustomer {
  id: number;
  name: string;
  code?: string | null;
  contactNumber?: string | null;
  phone?: string | null;
  addresses?: CustomerAddress[] | null;
  misaEmployeeName?: string | null;
  misaEmployeeCode?: string | null;
  taxCode?: string | null;
  identificationNumber?: string | null;
  invoiceBuyerName?: string | null;
  invoiceAddress?: string | null;
  debtPolicy?: { debtRuleType: DebtRuleType } | null;
  [key: string]: unknown;
}

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
  shippingFee: number;
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
  customer?: InvoiceCustomer | null;
  branch?: any;
  soldBy?: any;
  creator?: any;
  saleChannel?: any;
  details?: InvoiceDetail[];
  payments?: any[];
  delivery?: any;
  packingHangs?: InvoicePackingCreatorLink[];
  packingLoadings?: InvoicePackingCreatorLink[];
  packingSlips?: InvoicePackingCreatorLink[];
  paymentNotes?: PaymentNote[];
  /** Backend tính theo batch ID của trang hiện tại (bảng giá 2/3). */
  hasPriceBookWarning?: boolean;
  /** SL theo sản phẩm (quy về đơn vị cơ bản) khác đơn đặt hàng gốc. */
  hasQuantityWarning?: boolean;
  /** Chi tiết lý do cảnh báo cho tooltip; null khi không có cảnh báo. */
  warnings?: InvoiceListWarnings | null;
  /** Số phiếu cùng loại từng có liên kết với hóa đơn. */
  packingCount?: number;
  /** Ghi chú thanh toán mới nhất (API chọn hóa đơn để báo đơn trả về). */
  paymentNote?: InvoicePaymentNote | null;
}

/** Ghi chú thanh toán mới nhất của hóa đơn: khách trả tiền mặt hay chuyển khoản. */
export interface InvoicePaymentNote {
  paymentType: string;
  amount: number | null;
}

export interface InvoicePackingCreatorLink {
  id: number;
  createdAt?: string;
  packingHang?: InvoicePackingCreatorParent | null;
  packingLoading?: InvoicePackingCreatorParent | null;
  packingSlip?: InvoicePackingCreatorParent | null;
}

export interface InvoicePackingCreatorParent {
  createdAt?: string;
  creator?: {
    id: number;
    name: string;
  } | null;
}

export interface PaymentNote {
  id: number;
  paymentType: "cash" | "transfer";
  amount?: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
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
  soldExpiryDate?: string | null;
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

/** Lý do cảnh báo của hóa đơn trên danh sách (backend tính theo trang). */
export interface InvoiceListWarnings {
  price: { productCode: string; productName: string; price: number; listPrice: number }[];
  quantity: {
    productCode: string;
    productName: string;
    unit: string | null;
    /** Tổng SL đặt hàng. */
    orderQuantity: number;
    /** SL đã xuất ở các hóa đơn trước của cùng đơn (đơn tách giao). */
    previousQuantity: number;
    /** SL cần giao ở hóa đơn này = max(đặt − đã xuất trước, 0). */
    expectedQuantity: number;
    invoiceQuantity: number;
  }[];
  orderCode: string | null;
  /** Hóa đơn trước của cùng đơn đặt; có → so với SL còn lại. */
  previousInvoiceCodes: string[];
}
