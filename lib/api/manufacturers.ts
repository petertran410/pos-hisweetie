import { apiClient } from "@/lib/config/api";
import {
  isNsxUnit,
  normalizeNsxUnit,
  nsxPriceFactor,
  round2,
  round4,
  type NsxUnit,
} from "@/lib/utils/nsx-pricing";

export interface Manufacturer {
  id: number;
  code: string;
  name: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  note?: string;
  currency: "VND" | "CNY";
  supplierId: number | null;
  supplier?: { id: number; code?: string; name: string } | null;
  isActive: boolean;
}
export interface OwnMaterial {
  productId: number;
  quantity: number;
  unit: string;
}
/**
 * Dòng NSX bổ sung. Dòng mới: có productId, UNIT_PRICE, unit/priceUnit g|kg|gói.
 * Dòng cũ (phiếu đã gửi trước đây): có thể không mã, "TOTAL", priceUnit null.
 */
export interface ManufacturerMaterial {
  productId?: number | null;
  productCode?: string | null;
  description: string;
  pricingMode: "UNIT_PRICE" | "TOTAL";
  quantity?: number | null;
  unit?: string | null;
  unitPrice: number;
  priceUnit?: NsxUnit | null;
  amount: number;
}
export interface PayableRow {
  targetType: "purchase_order" | "production";
  targetId: number;
  code: string;
  date: string;
  manufacturerName?: string;
  total: number;
  paidAmount: number;
  debtAmount: number;
  currency: string;
  foreignDebt: number | null;
}
export interface PayableSummary {
  accountType: "S" | "M";
  accountId: number;
  partnerName: string;
  purchaseDebt: number;
  productionDebt: number;
  totalDebt: number;
  availableCredit: number;
  data: PayableRow[];
}
export interface PayableAllocation {
  targetType: "purchase_order" | "production";
  targetId: number;
  amount?: number;
  creditAmount?: number;
  foreignAmount?: number;
  creditForeignAmount?: number;
  exchangeRate?: number;
}
export interface PayablePayment {
  requestKey: string;
  totalAmount: number;
  branchId: number;
  method: string;
  accountId?: number;
  transDate?: string;
  description?: string;
  allocations: PayableAllocation[];
}
export const manufacturersApi = {
  list: (params?: {
    search?: string;
    includeInactive?: boolean;
    isActive?: boolean;
    hasInProgress?: boolean;
    hasDebt?: boolean;
    pageSize?: number;
    currentItem?: number;
  }) =>
    apiClient.get<{ data: Manufacturer[]; total: number }>("/manufacturers", params),
  get: (id: number) => apiClient.get<Manufacturer>(`/manufacturers/${id}`),
  create: (data: Omit<Manufacturer, "id" | "code" | "supplier">) => apiClient.post<Manufacturer>("/manufacturers", data),
  update: (id: number, data: Omit<Manufacturer, "supplier" | "id">) => apiClient.put<Manufacturer>(`/manufacturers/${id}`, data),
  payables: (type: "S" | "M", id: number) => apiClient.get<PayableSummary>(type === "S" ? `/payables/suppliers/${id}` : `/manufacturers/${id}/payables`),
  pay: (type: "S" | "M", id: number, data: PayablePayment) => type === "S"
    ? apiClient.post("/cashflows/supplier-payments", { ...data, supplierId: id })
    : apiClient.post(`/manufacturers/${id}/payments`, data),
  cancelPayment: (id: number) => apiClient.delete(`/payables/payments/${id}`),
};

/** Dòng cũ: không mã hàng, "Tổng tiền" hoặc chưa có đơn vị giá — chỉ còn để xem / nhận hàng. */
export const isLegacyMaterial = (line: ManufacturerMaterial) =>
  !line.productId || line.pricingMode === "TOTAL" || !line.priceUnit;

/** Thành tiền một dòng, làm tròn 2 số lẻ như backend (lượng làm tròn 4 số lẻ trước). */
export const materialTotal = (line: ManufacturerMaterial) => {
  if (line.pricingMode === "TOTAL") return Number(line.amount);
  const quantity = round4(Number(line.quantity ?? 0));
  if (!line.priceUnit) return round2(quantity * Number(line.unitPrice));
  return round2(quantity * (nsxPriceFactor(line.unit, line.priceUnit) ?? 0) * Number(line.unitPrice));
};

/** Payload gửi server: chỉ các trường DTO nhận (server bật forbidNonWhitelisted). */
export const materialPayload = (line: ManufacturerMaterial): ManufacturerMaterial => ({
  productId: line.productId ?? null,
  description: line.description,
  pricingMode: line.pricingMode,
  quantity: line.quantity ?? null,
  unit: line.unit ?? null,
  unitPrice: Number(line.unitPrice),
  priceUnit: line.priceUnit ?? null,
  amount: Number(line.amount),
});

type Numeric = number | string;
/** Dòng NSX đã lưu trên phiếu — Decimal trả về dạng chuỗi. */
type SavedMaterialRow = Omit<
  ManufacturerMaterial,
  "quantity" | "unitPrice" | "amount" | "priceUnit"
> & {
  quantity?: Numeric | null;
  unitPrice: Numeric;
  amount: Numeric;
  priceUnit?: string | null;
};

/** Dòng đã lưu trên phiếu (Decimal dạng chuỗi) → dòng trong form. */
export const materialFromRow = (line: SavedMaterialRow): ManufacturerMaterial => ({
  productId: line.productId,
  productCode: line.productCode ?? null,
  description: line.description,
  pricingMode: line.pricingMode,
  quantity: line.quantity == null ? null : Number(line.quantity),
  unit: line.unit,
  unitPrice: Number(line.unitPrice),
  priceUnit: isNsxUnit(line.priceUnit)
    ? (normalizeNsxUnit(line.priceUnit) as NsxUnit)
    : null,
  amount: Number(line.amount),
});
