import { apiClient } from "@/lib/config/api";

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
export interface ManufacturerMaterial {
  productId?: number | null;
  description: string;
  pricingMode: "UNIT_PRICE" | "TOTAL";
  quantity?: number | null;
  unit?: string | null;
  unitPrice: number;
  amount: number;
}
export interface ExternalTemplate {
  id: number;
  name: string;
  manufacturerId: number;
  productId: number;
  baseQuantity: number;
  currency: "VND" | "CNY";
  processingFee: number;
  exchangeRate: number;
  manufacturer?: { id: number; name: string };
  lines: Array<ManufacturerMaterial & { id: number; source: "OWN" | "MANUFACTURER" }>;
}
export interface TemplatePayload {
  name: string;
  manufacturerId: number;
  productId: number;
  baseQuantity: number;
  currency: "VND" | "CNY";
  processingFee: number;
  exchangeRate: number;
  ownMaterials: OwnMaterial[];
  manufacturerMaterials: ManufacturerMaterial[];
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
  templates: (manufacturerId?: number, productId?: number) =>
    apiClient.get<ExternalTemplate[]>("/manufacturers/templates", { manufacturerId, productId }),
  saveTemplate: (data: TemplatePayload, id?: number) => id
    ? apiClient.put<ExternalTemplate>(`/manufacturers/templates/${id}`, data)
    : apiClient.post<ExternalTemplate>("/manufacturers/templates", data),
  removeTemplate: (id: number) => apiClient.delete(`/manufacturers/templates/${id}`),
  payables: (type: "S" | "M", id: number) => apiClient.get<PayableSummary>(type === "S" ? `/payables/suppliers/${id}` : `/manufacturers/${id}/payables`),
  pay: (type: "S" | "M", id: number, data: PayablePayment) => type === "S"
    ? apiClient.post("/cashflows/supplier-payments", { ...data, supplierId: id })
    : apiClient.post(`/manufacturers/${id}/payments`, data),
  cancelPayment: (id: number) => apiClient.delete(`/payables/payments/${id}`),
};

export const materialTotal = (line: ManufacturerMaterial) =>
  line.pricingMode === "TOTAL" ? Number(line.amount) : Number(line.quantity ?? 0) * Number(line.unitPrice);
