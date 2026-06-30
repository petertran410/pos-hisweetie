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
  contractNo?: string | null; // Số HĐ gắn với dòng này (nullable)
  postImportStatus?: string; // pending | returned | kept
  // Các field tính toán trả về từ findOne:
  shipped?: number;
  received?: number;
  diff?: number; // >0 thiếu, <0 dư
  unitWeight?: number; // trọng lượng đơn vị (theo weightUnit)
  weightUnit?: string; // 'g' | 'kg'
  lineWeightKg?: number; // trọng lượng dòng đã quy đổi sang kg (× SL ghép)
  product?: { id: number; code: string; name: string };
  orderSupplier?: {
    id: number;
    code: string;
    supplier?: { id: number; code?: string | null; name: string };
  };
}

export interface VehicleFile {
  filename: string;
  url: string;
  size?: number;
  mimetype?: string;
  originalname?: string;
}

export interface VehicleShipment {
  id: number;
  code: string;
  status: number;
  statusValue?: string;
  branchId?: number;
  borderGateId?: number;
  vehicleInfo?: string; // số hợp đồng
  files?: VehicleFile[];
  expectedArrivalDate?: string;
  actualArrivalDate?: string;
  description?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  totalWeightKg?: number;
  branch?: { id: number; name: string };
  borderGate?: { id: number; name: string };
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
  branchIds?: number[];
  borderGateId?: number;
  createdById?: number;
  status?: number;
  search?: string;
  /** Số HĐ per-item trong phiếu ghép xe. */
  contractNo?: string;
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
  /** Số HĐ (hợp đồng) gắn với dòng này. Optional. */
  contractNo?: string;
}

/** Một dòng SP còn ghép được, trả về từ available-items. */
export interface AvailableItem {
  productId: number;
  productCode: string;
  productName: string;
  price: number;
  weight?: number;
  weightUnit?: string;
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
  status?: number;
  statusValue?: string;
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
