// Gia công ngoài: gửi nguyên liệu sang nhà máy, nhận thành phẩm về kho.

export const SUBCONTRACT_STATUS = {
  DRAFT: 1,
  PROCESSING: 2,
  PARTIALLY_RECEIVED: 3,
  COMPLETED: 4,
  CANCELLED: 5,
} as const;

export const SUBCONTRACT_STATUS_TEXT: Record<number, string> = {
  1: "Nháp",
  2: "Đang gia công",
  3: "Nhận một phần",
  4: "Hoàn thành",
  5: "Đã hủy",
};

export const SUBCONTRACT_STATUS_COLOR: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-indigo-100 text-indigo-700",
  4: "bg-green-100 text-green-700",
  5: "bg-red-100 text-red-700",
};

export type SubcontractCurrency = "VND" | "CNY";

export const SUBCONTRACT_COST_TYPES: { value: string; label: string }[] = [
  { value: "freight_out", label: "Vận chuyển chiều đi" },
  { value: "freight_in", label: "Vận chuyển chiều về" },
  { value: "import_duty", label: "Thuế nhập khẩu" },
  { value: "customs", label: "Phí hải quan" },
  { value: "packaging", label: "Bao bì / phụ liệu" },
  { value: "compensation", label: "Bồi thường (số âm)" },
  { value: "other", label: "Chi phí khác" },
];

export const SUBCONTRACT_COST_TYPE_LABEL: Record<string, string> =
  Object.fromEntries(SUBCONTRACT_COST_TYPES.map((t) => [t.value, t.label]));

export interface SubcontractMaterial {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  plannedQuantity: number;
  sentQuantity: number;
  returnedQuantity: number;
  consumedQuantity: number;
  /** null khi người dùng không có quyền xem giá vốn. */
  unitCost: number | null;
  /** Nguyên liệu còn nằm tại nhà máy (chỉ khác 0 khi lệnh đang mở). */
  atFactoryQuantity: number;
  note?: string | null;
}

export interface SubcontractReceipt {
  id: number;
  code: string;
  receivedDate: string;
  goodQuantity: number;
  defectQuantity: number;
  unitPrice: number;
  exchangeRate: number;
  foreignAmount?: number | null;
  amount: number;
  status: number; // 1 hiệu lực, 2 đã hủy
  note?: string | null;
  createdByName: string;
  createdAt: string;
}

export interface SubcontractCost {
  id: number;
  type: string;
  name: string;
  amount: number;
  isFactoryPayable: boolean;
  costDate: string;
  note?: string | null;
}

export interface SubcontractPayment {
  id: number;
  code: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: number; // 1 hiệu lực, 2 đã hủy
  description?: string | null;
  exchangeRate?: number | null;
  foreignAmount?: number | null;
  account?: { id: number; bankName: string; accountNumber: string } | null;
}

export interface SubcontractOrder {
  id: number;
  code: string;
  supplierId: number;
  factoryId?: number | null;
  branchId: number;
  branchName: string;
  receiveBranchId: number;
  receiveBranchName: string;
  productId: number;
  productCode: string;
  productName: string;
  formulaId?: number | null;
  formulaName?: string | null;
  plannedQuantity: number;
  processingUnitPrice: number;
  currency: SubcontractCurrency;
  exchangeRate: number;
  lossAllowancePercent: number;
  status: number;
  statusLabel: string;
  orderDate: string;
  expectedDate?: string | null;
  sentDate?: string | null;
  completedDate?: string | null;
  note?: string | null;
  cancelReason?: string | null;

  goodQuantity: number;
  defectQuantity: number;
  processingCost: number;
  otherCost: number;
  payableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  // Các số dưới đây là null khi không có quyền xem giá vốn.
  materialCost: number | null;
  totalCost: number | null;
  unitCost: number | null;
  estimatedTotalCost: number | null;
  estimatedUnitCost: number | null;
  lossPercent: number | null;
  lossExceeded: boolean | null;

  /** Đã hoàn thành nhưng chưa áp giá thành vào giá vốn thành phẩm. */
  costPending: boolean;
  costAppliedAt?: string | null;
  appliedUnitCost: number | null;

  createdByName: string;
  createdAt: string;

  supplier?: { id: number; code?: string | null; name: string; debt: number };
  factory?: {
    id: number;
    code?: string | null;
    name: string;
    currency?: string | null;
  } | null;
  product?: { id: number; code: string; name: string; unit?: string | null };
  materials: SubcontractMaterial[];
  receipts: SubcontractReceipt[];
  costs: SubcontractCost[];
  payments: SubcontractPayment[];
}

export interface SubcontractOrderFilters {
  status?: number[];
  branchIds?: number[];
  supplierId?: number;
  factoryId?: number;
  productId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  pageSize?: number;
  currentItem?: number;
}

export interface SubcontractMaterialInput {
  productId: number;
  plannedQuantity: number;
  note?: string;
}

export interface SubcontractCostInput {
  type?: string;
  name: string;
  amount: number;
  isFactoryPayable?: boolean;
  costDate?: string;
  note?: string;
}

export interface SubcontractOrderInput {
  supplierId: number;
  factoryId?: number | null;
  branchId: number;
  receiveBranchId: number;
  productId: number;
  formulaId?: number | null;
  plannedQuantity: number;
  processingUnitPrice: number;
  currency?: SubcontractCurrency;
  exchangeRate?: number;
  lossAllowancePercent?: number;
  orderDate?: string;
  expectedDate?: string | null;
  note?: string | null;
  materials?: SubcontractMaterialInput[];
  costs?: SubcontractCostInput[];
}

export interface MaterialSuggestion {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  inputMode?: string | null;
  plannedQuantity: number;
  unitCost: number | null;
  onHand: number;
}

export interface MaterialAtFactoryRow {
  orderId: number;
  orderCode: string;
  sentDate?: string | null;
  expectedDate?: string | null;
  supplier?: { id: number; name: string };
  factory?: { id: number; name: string } | null;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  sentQuantity: number;
  quantity: number;
  unitCost: number | null;
  value: number | null;
}

export interface SubcontractCostPreview {
  orderId: number;
  productId: number;
  productName: string;
  receiveBranchId: number;
  receiveBranchName: string;
  goodQuantity: number;
  totalCost: number;
  unitCost: number;
  onHand: number;
  oldCost: number;
  otherQuantity: number;
  proposedCost: number;
  applied: boolean;
  appliedUnitCost: number | null;
  branches: {
    branchId: number;
    branchName: string;
    onHand: number;
    cost: number;
    isReceiveBranch: boolean;
  }[];
}

export interface SubcontractPaymentInput {
  amount: number;
  paymentMethod?: string;
  accountId?: number;
  paymentDate?: string;
  notes?: string;
  exchangeRate?: number;
  foreignAmount?: number;
  confirmExceed?: boolean;
}

/**
 * Hao hụt thực tế so với định mức, tính theo GIÁ TRỊ nguyên liệu / 1 thành
 * phẩm (gộp được nhiều nguyên liệu khác đơn vị). Cùng công thức với backend
 * (subcontract-orders.service.ts → serialize) để màn quyết toán xem trước
 * đúng con số sẽ được lưu.
 */
export function computeLossPercent(input: {
  plannedQuantity: number;
  goodQuantity: number;
  materials: {
    plannedQuantity: number;
    sentQuantity: number;
    returnedQuantity: number;
    unitCost: number | null;
  }[];
}): number | null {
  const { plannedQuantity, goodQuantity, materials } = input;
  if (plannedQuantity <= 0 || goodQuantity <= 0) return null;
  const plannedValue = materials.reduce(
    (s, m) => s + m.plannedQuantity * (m.unitCost ?? 0),
    0,
  );
  if (plannedValue <= 0) return null;
  const consumedValue = materials.reduce(
    (s, m) => s + (m.sentQuantity - m.returnedQuantity) * (m.unitCost ?? 0),
    0,
  );
  const actualPerUnit = consumedValue / goodQuantity;
  const plannedPerUnit = plannedValue / plannedQuantity;
  return Math.round((actualPerUnit / plannedPerUnit - 1) * 10000) / 100;
}
