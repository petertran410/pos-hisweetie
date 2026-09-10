import type { Product } from '@/lib/api/products';

export type CustomerDemandStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type CustomerDemandUnit = 'BASE' | 'CARTON';

export const CUSTOMER_DEMAND_STATUS_LABEL: Record<CustomerDemandStatus, string> = {
  DRAFT: 'Nháp',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
};

export interface CustomerDemandLineInput {
  productId: number;
  quantity: number;
  unit: CustomerDemandUnit;
}

export interface CustomerDemandMonthInput {
  id?: number;
  month: string;
  lines: CustomerDemandLineInput[];
  changeNote?: string;
}

export interface CustomerDemandLine {
  id: number;
  productId: number;
  product: Pick<Product, 'id' | 'code' | 'name' | 'unit' | 'conversionValue'>;
  inputQuantity: number;
  inputUnit: CustomerDemandUnit;
  quantityBase: number;
  conversionValue: number;
}

export interface CustomerDemandChangeLog {
  id: number;
  action: 'EDIT' | 'APPROVE' | 'CANCEL' | string;
  reason: string;
  createdAt: string;
  actor?: { id: number; name: string; email?: string | null } | null;
}

export interface CustomerDemandMonth {
  id: number;
  month: string;
  status: CustomerDemandStatus;
  note?: string | null;
  approvedAt?: string | null;
  cancelledAt?: string | null;
  quantityBase?: number;
  productCount?: number;
  lines?: CustomerDemandLine[];
  changeLogs?: CustomerDemandChangeLog[];
}

export interface CustomerDemand {
  id: number;
  customer: { id: number; code?: string | null; name: string };
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  totalProducts: number;
  totalQuantityBase: number;
  months: CustomerDemandMonth[];
}

export interface CustomerDemandListResponse {
  data: CustomerDemand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerDemandFilters {
  customerId?: number;
  month?: string;
  status?: CustomerDemandStatus;
  page?: number;
  limit?: number;
}

export interface CreateCustomerDemandRequest {
  customerId: number;
  note?: string;
  months: CustomerDemandMonthInput[];
}

export interface UpdateCustomerDemandRequest {
  customerId?: number;
  note?: string;
  months: CustomerDemandMonthInput[];
}

export interface CustomerDemandImportPreviewRow {
  row: number;
  customerCode: string;
  customerName: string;
  productCode: string;
  productName: string;
  month: string | null;
  quantity: number | null;
  unit: CustomerDemandUnit;
  note?: string;
  errors: string[];
  customer: { id: number; code?: string | null; name: string } | null;
  product: {
    id: number;
    code: string;
    name: string;
    unit?: string | null;
    conversionValue: number;
  } | null;
  quantityBase: number | null;
}

export interface CustomerDemandImportPreview {
  total: number;
  valid: number;
  invalid: number;
  vouchers: number;
  months: number;
  rows: CustomerDemandImportPreviewRow[];
}

export interface CustomerDemandImportResult {
  total: number;
  imported: number;
  vouchers: number;
  months: number;
  ids: number[];
}
