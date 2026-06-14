export interface ConsignmentItem {
  id: number;
  consignmentId: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  discountRatio: number;
  totalPrice: number;
  note?: string | null;
  manufactureDate?: string | null;
  product?: {
    id: number;
    code: string;
    name: string;
    inventories?: Array<{ branchId: number; onHand: number }>;
  };
}

export interface Consignment {
  id: number;
  code: string;
  customerId?: number;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
  priceBookId?: number;
  priceBookName?: string;
  consignDate: string;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  grandTotal: number;
  status: number;
  statusValue?: string;
  consignStatus: string;
  toComplete: boolean;
  description?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    code?: string;
    name: string;
    contactNumber?: string;
    totalDebt?: number;
  };
  branch?: { id: number; name: string };
  soldBy?: { id: number; name: string };
  creator?: { id: number; name: string };
  items?: ConsignmentItem[];
  delivery?: {
    id: number;
    receiver: string;
    contactNumber: string;
    address: string;
    locationName?: string;
    wardName?: string;
    weight?: number;
    weightUnit?: string;
    length?: number;
    width?: number;
    height?: number;
    noteForDriver?: string;
  } | null;
  invoices?: Array<{
    id: number;
    code: string;
    grandTotal: number;
    status: number;
    statusValue?: string;
    details?: Array<{ productId: number; quantity: number }>;
  }>;
  returns?: Array<{
    id: number;
    code: string;
    status: number;
    statusValue?: string;
    createdAt?: string;
    totalReturnQuantity?: number;
    details: Array<{
      productId: number;
      productCode?: string;
      productName?: string;
      returnQuantity: number;
      goodQuantity?: number;
      damagedQuantity?: number;
      nearExpiryQuantity?: number;
    }>;
  }>;
}

export interface ConsignmentFilters {
  branchId?: number;
  branchIds?: number[];
  customerId?: number;
  status?: number[];
  soldById?: number;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  currentItem?: number;
  search?: string;
}

export const CONSIGNMENT_STATUS = {
  PENDING: 1,
  CONFIRMED: 2,
  PACKED: 3,
  LOADING: 4,
  DELIVERED: 5,
  PARTIALLY_INVOICED: 6,
  COMPLETED: 7,
  CANCELLED: 8,
} as const;

// Map number → string key để gửi lên BE qua field `statuses`.
// Mirror CONSIGNMENT_STATUS_NUMBER_TO_STRING ở BE
// (src/consignments/dto/consignment-status.constants.ts).
export const CONSIGNMENT_STATUS_KEY: Record<number, string> = {
  [CONSIGNMENT_STATUS.PENDING]: "pending",
  [CONSIGNMENT_STATUS.CONFIRMED]: "confirmed",
  [CONSIGNMENT_STATUS.PACKED]: "packed",
  [CONSIGNMENT_STATUS.LOADING]: "loading",
  [CONSIGNMENT_STATUS.DELIVERED]: "delivered",
  [CONSIGNMENT_STATUS.PARTIALLY_INVOICED]: "partially_invoiced",
  [CONSIGNMENT_STATUS.COMPLETED]: "completed",
  [CONSIGNMENT_STATUS.CANCELLED]: "cancelled",
};

export const CONSIGNMENT_STATUS_LABELS: Record<number, string> = {
  [CONSIGNMENT_STATUS.PENDING]: "Phiếu tạm",
  [CONSIGNMENT_STATUS.CONFIRMED]: "Đã xác nhận",
  [CONSIGNMENT_STATUS.PACKED]: "Đã đóng hàng",
  [CONSIGNMENT_STATUS.LOADING]: "Đang giao",
  [CONSIGNMENT_STATUS.DELIVERED]: "Đã giao (đang ký gửi)",
  [CONSIGNMENT_STATUS.PARTIALLY_INVOICED]: "Ký gửi một phần",
  [CONSIGNMENT_STATUS.COMPLETED]: "Hoàn thành",
  [CONSIGNMENT_STATUS.CANCELLED]: "Đã hủy",
};

export const CONSIGNMENT_STATUS_COLOR: Record<number, string> = {
  [CONSIGNMENT_STATUS.PENDING]: "bg-gray-100 text-gray-700",
  [CONSIGNMENT_STATUS.CONFIRMED]: "bg-blue-100 text-blue-700",
  [CONSIGNMENT_STATUS.PACKED]: "bg-indigo-100 text-indigo-700",
  [CONSIGNMENT_STATUS.LOADING]: "bg-cyan-100 text-cyan-700",
  [CONSIGNMENT_STATUS.DELIVERED]: "bg-teal-100 text-teal-700",
  [CONSIGNMENT_STATUS.PARTIALLY_INVOICED]: "bg-yellow-100 text-yellow-700",
  [CONSIGNMENT_STATUS.COMPLETED]: "bg-green-100 text-green-700",
  [CONSIGNMENT_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

export function getStatusLabel(status: number): string {
  return CONSIGNMENT_STATUS_LABELS[status] || "Không xác định";
}

// Trạng thái phiếu hoàn ký gửi (mirror BE CONSIGNMENT_RETURN_STATUS).
export const CONSIGNMENT_RETURN_STATUS = {
  REQUEST: 1,
  STOCK_RECEIVED: 2,
  CANCELLED: 5,
} as const;

export const CONSIGNMENT_RETURN_STATUS_LABELS: Record<number, string> = {
  [CONSIGNMENT_RETURN_STATUS.REQUEST]: "Chờ nhận hàng",
  [CONSIGNMENT_RETURN_STATUS.STOCK_RECEIVED]: "Đã nhận hàng",
  [CONSIGNMENT_RETURN_STATUS.CANCELLED]: "Đã hủy",
};

export const CONSIGNMENT_RETURN_STATUS_COLOR: Record<number, string> = {
  [CONSIGNMENT_RETURN_STATUS.REQUEST]: "bg-yellow-100 text-yellow-700",
  [CONSIGNMENT_RETURN_STATUS.STOCK_RECEIVED]: "bg-green-100 text-green-700",
  [CONSIGNMENT_RETURN_STATUS.CANCELLED]: "bg-red-100 text-red-700",
};

export function getReturnStatusLabel(status: number): string {
  return CONSIGNMENT_RETURN_STATUS_LABELS[status] || "Không xác định";
}
