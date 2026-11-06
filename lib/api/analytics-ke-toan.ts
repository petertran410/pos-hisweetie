import { apiClient } from "@/lib/config/api";

// Báo cáo Phân tích › Kế Toán (thay Power BI "Báo Cáo Kế Toán", accounting_dataset).
// Backend: /reports/analytics/ke-toan/*

const BASE = "/reports/analytics/ke-toan";

/** Giá trị slicer cho "(Trống)" (product_type = null). */
export const KE_TOAN_BLANK = "__blank__";

// ── Mapping Misa ────────────────────────────────────────────────────────────
export interface MisaFilters {
  productTypes?: string[];
  productNames?: string[];
}

export interface MisaRow {
  code: string;
  name: string;
  productType: string | null;
  category: string | null;
  origin: string | null;
  misaCode: string;
  misaName: string;
  misaUnit: string;
  onhandHn: number | null;
  onhandSg: number | null;
}

export interface MisaReport {
  rows: MisaRow[];
  totals: { onhandHn: number | null; onhandSg: number | null };
  options: { productTypes: string[]; productNames: string[] };
  updatedAt: string;
}

// ── Tiền Mặt - Kho / Đối Soát ───────────────────────────────────────────────
export interface CashFilters {
  branch?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
}

export interface CashSlipRow {
  date: string;
  code: string;
  customerName: string | null;
  branch: string | null;
  amount: number;
}

interface CashSlicers {
  branches: string[];
  dateRange: { min: string | null; max: string | null };
  updatedAt: string;
}

export interface CashReport extends CashSlicers {
  rows: CashSlipRow[];
  columns: string[];
  total: number;
}

export interface InvoiceCodRow {
  date: string | null;
  code: string;
  customerName: string | null;
  branch: string | null;
  amount: number;
  cancelled: boolean;
}

export interface ReconcileRow {
  date: string | null;
  customerName: string | null;
  delivered: number | null;
  invoiceCod: number | null;
}

export interface ReconcileReport extends CashSlicers {
  pivot: ReconcileRow[];
  packing: CashSlipRow[];
  invoices: InvoiceCodRow[];
  totals: { delivered: number | null; invoiceCod: number | null };
}

// ── Chuyển Hàng ─────────────────────────────────────────────────────────────
export interface TransferFilters {
  productNames?: string[];
}

export interface TransferMetrics {
  onhandHn: number | null;
  onhandSg: number | null;
  sale5: number | null;
  sale30: number | null;
  sale90: number | null;
  transfer: number | null;
  reservedSg: number | null;
  reservedHn: number | null;
  confirmed: number | null;
  avg5: number | null;
  avg30: number | null;
  avg90: number | null;
  demand: number | null;
  safe: number | null;
  point: number | null;
  available: number | null;
  target: number | null;
  rec: number;
  bulk: number;
  warning: string;
  reason: string;
  hnOutbound: string;
}

export interface TransferRow extends TransferMetrics {
  code: string;
  name: string;
}

export interface TransferReport {
  asOf: string;
  windows: Record<"d5" | "d30" | "d90", { from: string; to: string }>;
  rows: TransferRow[];
  totals: TransferMetrics | null;
  productNames: string[];
  updatedAt: string;
}

export const analyticsKeToanApi = {
  getMappingMisa: (p: MisaFilters): Promise<MisaReport> =>
    apiClient.get(`${BASE}/mapping-misa`, p),
  getTienMatKho: (p: CashFilters): Promise<CashReport> =>
    apiClient.get(`${BASE}/tien-mat-kho`, p),
  getDoiSoat: (p: CashFilters): Promise<ReconcileReport> =>
    apiClient.get(`${BASE}/doi-soat`, p),
  getChuyenHang: (p: TransferFilters): Promise<TransferReport> =>
    apiClient.get(`${BASE}/chuyen-hang`, p),
};
