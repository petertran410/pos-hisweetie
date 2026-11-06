import { apiClient } from "@/lib/config/api";

// Phân tích › Chuyển Kho + Thu Mua (thay Power BI dataset_purchasing).
// Backend: /reports/analytics/mua-hang/*

const BASE = "/reports/analytics/mua-hang";

/** Slicer sản phẩm / kho (mỗi slicer chọn nhiều giá trị như Power BI). */
export interface MuaHangFilters {
  branches?: string[];
  productTypes?: string[];
  brands?: string[];
  visualGroups?: string[];
  groups2026?: string[];
  categories?: string[];
  productCodes?: string[];
}

export interface MuaHangPeriodFilters extends MuaHangFilters {
  year?: number; // bỏ trống = mọi năm
  months?: number[];
}

export type MuaHangTrendLevel = "year" | "month" | "day";

export interface MuaHangSalesFilters extends MuaHangPeriodFilters {
  trendLevel?: MuaHangTrendLevel;
}

export interface MuaHangDemandFilters extends MuaHangPeriodFilters {
  customerIds?: number[];
}

export interface MuaHangFilterOptions {
  blank: string;
  warehouses: string[];
  branches: string[];
  productTypes: string[];
  brands: string[];
  categories: string[];
  origins: string[];
  visualGroups: string[];
  groups2026: string[];
  products: { code: string; name: string; isActive: boolean }[];
  years: number[];
  demandCustomers: { id: number; code: string; name: string }[];
}

type N = number | null;

// ── Chuyển Kho ────────────────────────────────────────────────────────────
export interface ChuyenKhoCell {
  onhand: N;
  onorder: N;
  reserved: N;
  transfer: N;
  sale: N;
  avgSale: N;
}
export interface ChuyenKhoCells {
  cells: Record<string, ChuyenKhoCell>;
  total: ChuyenKhoCell;
}
export interface ChuyenKhoData {
  asOf: string;
  saleRange: { from: string; to: string; days: number };
  branches: string[];
  rows: (ChuyenKhoCells & { group: string; code: string; name: string })[];
  groups: (ChuyenKhoCells & { group: string })[];
  total: ChuyenKhoCells;
  updatedAt: string;
}

export interface LoaiBCell {
  nearExp: N;
  damaged: N;
  promo: N;
}
export interface HangLoaiBData {
  branches: string[];
  rows: {
    code: string;
    name: string;
    cells: Record<string, LoaiBCell>;
    total: LoaiBCell;
  }[];
  total: { cells: Record<string, LoaiBCell>; total: LoaiBCell };
  updatedAt: string;
}

// ── Thu Mua › Tồn Kho ─────────────────────────────────────────────────────
export interface StockCell {
  onhand: N;
  onorder: N;
  reserved: N;
}
export interface StockGroupRow extends StockCell {
  key: string | null;
}
export interface PromoCell {
  promo: N;
  nearExp: N;
}
export interface TonKhoData {
  branches: string[];
  detail: {
    rows: {
      name: string;
      cells: Record<string, StockCell>;
      total: StockCell;
    }[];
    total: { cells: Record<string, StockCell>; total: StockCell };
  };
  byBranch: StockGroupRow[];
  byVisualGroup: StockGroupRow[];
  byProductType: StockGroupRow[];
  byOrigin: (StockGroupRow & {
    origin: string | null;
    category: string | null;
  })[];
  total: StockCell;
  promo: {
    rows: {
      name: string;
      cells: Record<string, PromoCell>;
      total: PromoCell;
    }[];
    total: { cells: Record<string, PromoCell>; total: PromoCell };
  };
  updatedAt: string;
}

// ── Thu Mua › Nhóm Hàng / Nguồn Hàng ──────────────────────────────────────
export interface SalesCell {
  amount: N;
  qty: N;
}
export interface MuaHangPeriod {
  key: string; // yyyymm
  year: number;
  month: number;
}
export interface SalesPageData {
  by: "group" | "origin";
  trendLevel: MuaHangTrendLevel;
  periods: MuaHangPeriod[];
  pie: { key: string | null; qty: N }[];
  pivot: {
    key: string | null;
    cells: Record<string, SalesCell>;
    total: SalesCell;
    items: {
      name: string;
      cells: Record<string, SalesCell>;
      total: SalesCell;
    }[];
  }[];
  total: { cells: Record<string, SalesCell>; total: SalesCell };
  trend: {
    series: string[];
    points: ({ key: string } & Record<string, N | string>)[];
  };
  updatedAt: string;
}

// ── Thu Mua › Đặt Theo Đơn ────────────────────────────────────────────────
export interface DatTheoDonData {
  periods: MuaHangPeriod[];
  rows: {
    code: string;
    name: string;
    unit: string | null;
    cells: Record<string, N>;
    total: N;
  }[];
  total: { cells: Record<string, N>; total: N };
  updatedAt: string;
}

// ── Cấu hình ──────────────────────────────────────────────────────────────
export interface CodeMergeRow {
  id: number;
  fromCode: string;
  fromName: string | null;
  toCode: string;
  toName: string | null;
  note: string | null;
}
export interface ExcludedSellerRow {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
  excluded: boolean;
  rowId: number | null;
}
export interface PurchaseProductRow {
  id: number;
  productCode: string;
  productName: string | null;
  manufactory: string | null;
  spec: string | null;
  supplyType: string | null;
  minOrderBox: number | null;
  minStockHn: number | null;
  minStockSg: number | null;
  packDetail: string | null;
  convertQuantity: number | null;
  subCateLv1: string | null;
  subCateLv2: string | null;
}
export type PurchaseProductInput = Partial<
  Omit<PurchaseProductRow, "id" | "productName" | "productCode">
> & { productCode?: string };

export type RebateType = "value" | "percent" | "both";
export interface RebateRow {
  id: number;
  applyYear: number;
  manufactory: string;
  rebateName: string;
  targetCny: number | null;
  targetVnd: number | null;
  rebateType: RebateType;
  mainValue: number | null;
  subValue: number | null;
}
export type RebateInput = Partial<Omit<RebateRow, "id">>;

const CFG = `${BASE}/config`;

export const analyticsMuaHangApi = {
  getFilterOptions: (): Promise<MuaHangFilterOptions> =>
    apiClient.get(`${BASE}/filter-options`),
  getChuyenKho: (p: MuaHangFilters): Promise<ChuyenKhoData> =>
    apiClient.get(`${BASE}/chuyen-kho`, p),
  getHangLoaiB: (p: MuaHangFilters): Promise<HangLoaiBData> =>
    apiClient.get(`${BASE}/chuyen-kho/hang-loai-b`, p),
  getTonKho: (p: MuaHangFilters): Promise<TonKhoData> =>
    apiClient.get(`${BASE}/thu-mua/ton-kho`, p),
  getNhomHang: (p: MuaHangSalesFilters): Promise<SalesPageData> =>
    apiClient.get(`${BASE}/thu-mua/nhom-hang`, p),
  getNguonHang: (p: MuaHangSalesFilters): Promise<SalesPageData> =>
    apiClient.get(`${BASE}/thu-mua/nguon-hang`, p),
  getDatTheoDon: (p: MuaHangDemandFilters): Promise<DatTheoDonData> =>
    apiClient.get(`${BASE}/thu-mua/dat-theo-don`, p),

  // Cấu hình: gộp mã hàng
  listCodeMerges: (search?: string): Promise<CodeMergeRow[]> =>
    apiClient.get(`${CFG}/code-merges`, { search: search || undefined }),
  createCodeMerge: (d: { fromCode: string; toCode: string; note?: string }) =>
    apiClient.post(`${CFG}/code-merges`, d),
  updateCodeMerge: (id: number, d: { toCode?: string; note?: string | null }) =>
    apiClient.patch(`${CFG}/code-merges/${id}`, d),
  deleteCodeMerge: (id: number) => apiClient.delete(`${CFG}/code-merges/${id}`),

  // Cấu hình: nhân viên loại khỏi số bán
  listExcludedSellers: (): Promise<ExcludedSellerRow[]> =>
    apiClient.get(`${CFG}/excluded-sellers`),
  addExcludedSeller: (userId: number) =>
    apiClient.post(`${CFG}/excluded-sellers`, { userId }),
  removeExcludedSeller: (userId: number) =>
    apiClient.delete(`${CFG}/excluded-sellers/${userId}`),

  // Cấu hình: thông số mua hàng theo mã
  listPurchaseProducts: (p: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: PurchaseProductRow[];
    total: number;
    page: number;
    limit: number;
  }> =>
    apiClient.get(`${CFG}/purchase-products`, {
      ...p,
      search: p.search || undefined,
    }),
  createPurchaseProduct: (d: PurchaseProductInput & { productCode: string }) =>
    apiClient.post(`${CFG}/purchase-products`, d),
  updatePurchaseProduct: (id: number, d: PurchaseProductInput) =>
    apiClient.patch(`${CFG}/purchase-products/${id}`, d),
  deletePurchaseProduct: (id: number) =>
    apiClient.delete(`${CFG}/purchase-products/${id}`),

  // Cấu hình: rebate
  listRebates: (search?: string): Promise<RebateRow[]> =>
    apiClient.get(`${CFG}/rebates`, { search: search || undefined }),
  createRebate: (d: RebateInput) => apiClient.post(`${CFG}/rebates`, d),
  updateRebate: (id: number, d: RebateInput) =>
    apiClient.patch(`${CFG}/rebates/${id}`, d),
  deleteRebate: (id: number) => apiClient.delete(`${CFG}/rebates/${id}`),
};
