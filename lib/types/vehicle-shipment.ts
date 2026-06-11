export const VEHICLE_SHIPMENT_STATUS = {
  DRAFT: 0,
  CONFIRMED: 1,
  RECEIVED: 2,
  CANCELLED: 3,
} as const;

export const VEHICLE_SHIPMENT_STATUS_LABELS: Record<number, string> = {
  [VEHICLE_SHIPMENT_STATUS.DRAFT]: "Phiếu tạm",
  [VEHICLE_SHIPMENT_STATUS.CONFIRMED]: "Đã xác nhận giao",
  [VEHICLE_SHIPMENT_STATUS.RECEIVED]: "Đã nhập",
  [VEHICLE_SHIPMENT_STATUS.CANCELLED]: "Đã hủy",
};

export function getVehicleShipmentStatusLabel(status: number): string {
  return VEHICLE_SHIPMENT_STATUS_LABELS[status] || "Không xác định";
}

export interface VehicleShipmentItem {
  id: number;
  vehicleShipmentId: number;
  orderSupplierId: number;
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  postImportStatus?: string; // pending | returned | kept
  // Các field tính toán trả về từ findOne:
  shipped?: number;
  received?: number;
  diff?: number; // >0 thiếu, <0 dư
  product?: { id: number; code: string; name: string };
  orderSupplier?: {
    id: number;
    code: string;
    supplier?: { id: number; code?: string | null; name: string };
  };
}

export interface VehicleShipment {
  id: number;
  code: string;
  status: number;
  statusValue?: string;
  branchId?: number;
  vehicleInfo?: string;
  description?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  branch?: { id: number; name: string };
  creator?: { id: number; name: string };
  items?: VehicleShipmentItem[];
  purchaseOrders?: Array<{
    id: number;
    code: string;
    status?: number;
    statusValue?: string;
  }>;
}

export interface VehicleShipmentFilters {
  branchId?: number;
  status?: number;
  search?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  pageSize?: number;
  currentItem?: number;
}

/** Một dòng ghép xe khi tạo/sửa phiếu. */
export interface VehicleShipmentItemInput {
  orderSupplierId: number;
  productId: number;
  quantity: number;
}

/** Một dòng SP còn ghép được, trả về từ available-items. */
export interface AvailableItem {
  productId: number;
  productCode: string;
  productName: string;
  price: number;
  ordered: number;
  received: number;
  shipped: number;
  remaining: number;
}

export interface AvailableOrderSupplier {
  orderSupplierId: number;
  code: string;
  orderDate: string;
  branchId?: number;
  supplier?: { id: number; code?: string | null; name: string } | null;
  items: AvailableItem[];
}

/** Payload sinh phiếu nhập từ xe. */
export interface CreatePOFromVehicleItem {
  productId: number;
  receivedQuantity: number;
  price?: number;
  discount?: number;
  totalPrice?: number;
  description?: string;
}

export interface CreatePOFromVehicleSection {
  orderSupplierId: number;
  code?: string;
  purchaseDate?: string;
  isDraft?: boolean;
  discount?: number;
  description?: string;
  purchaseById?: number;
  items: CreatePOFromVehicleItem[];
}
