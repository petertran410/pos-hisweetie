import { apiClient } from "@/lib/config/api";

/**
 * Tồn nguyên liệu của mình đang nằm ở NSX (gửi trước, dùng dần cho nhiều phiếu
 * gửi sản xuất) và các phiếu nguyên liệu NSX: Gửi / Trả về kho / Điều chỉnh.
 */
/** OPENING: khai báo tồn đầu — hàng đã ở NSX từ trước, kho mình đã trừ. */
export type StockSlipType = "SEND" | "RETURN" | "ADJUST" | "OPENING";

export const STOCK_SLIP_LABEL: Record<StockSlipType, string> = {
  SEND: "Gửi nguyên liệu",
  RETURN: "Trả về kho",
  ADJUST: "Điều chỉnh",
  OPENING: "Tồn đầu",
};

type Numeric = number | string;

export interface ManufacturerStockRow {
  productId: number;
  productCode: string;
  productName: string;
  unit: string | null;
  /** Gram / 1 đơn vị kho (0 = chưa khai khối lượng). */
  gramsPerUnit: number;
  /** Tồn tại NSX theo đơn vị kho. */
  units: number;
  avgCost: number;
  value: number;
}

export interface ManufacturerStockMove {
  kind: "slip" | "production";
  type: StockSlipType | "PRODUCTION";
  refId: number;
  refCode: string;
  date: string;
  description: string;
  units: number;
  unitCost: number;
  balanceAfter: number;
}

export interface ManufacturerStockSlipLine {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  /** Gửi / Trả: lượng; Điều chỉnh: thực tế còn. */
  quantity: Numeric;
  unit: string;
  conversionFactor: Numeric | null;
  /** Lượng đơn vị kho có dấu theo tồn NSX. */
  units: Numeric;
  systemUnits: Numeric | null;
  unitCost: Numeric;
  amount: Numeric;
}

export interface ManufacturerStockSlip {
  id: number;
  code: string;
  type: StockSlipType;
  /** 1 hiệu lực, 2 đã hủy. */
  status: number;
  manufacturerId: number;
  branchId: number | null;
  branchName: string | null;
  date: string;
  note: string | null;
  totalValue: Numeric;
  createdByName: string;
  updatedByName: string | null;
  cancelledAt: string | null;
  cancelledByName: string | null;
  createdAt: string;
  lines: ManufacturerStockSlipLine[];
  manufacturer?: { id: number; code: string; name: string };
}

export interface ManufacturerStockSlipInput {
  type?: StockSlipType;
  branchId?: number | null;
  date?: string;
  note?: string | null;
  /** unitCost: chỉ cho Khai báo tồn đầu (giá vốn / 1 đơn vị kho). */
  lines: Array<{
    productId: number;
    quantity: number;
    unit: string;
    unitCost?: number;
  }>;
}

export const manufacturerStockApi = {
  list: (manufacturerId: number) =>
    apiClient.get<{ data: ManufacturerStockRow[]; totalValue: number }>(
      `/manufacturers/${manufacturerId}/stock`,
    ),
  moves: (manufacturerId: number, productId: number) =>
    apiClient.get<{ data: ManufacturerStockMove[] }>(
      `/manufacturers/${manufacturerId}/stock/moves`,
      { productId },
    ),
  slips: (manufacturerId: number) =>
    apiClient.get<ManufacturerStockSlip[]>(
      `/manufacturers/${manufacturerId}/stock-slips`,
    ),
  findByCode: (code: string) =>
    apiClient.get<{
      id: number;
      code: string;
      manufacturerId: number;
      manufacturer: { code: string };
    }>(`/manufacturers/stock-slips/by-code/${encodeURIComponent(code)}`),
  create: (manufacturerId: number, data: ManufacturerStockSlipInput) =>
    apiClient.post<ManufacturerStockSlip>(
      `/manufacturers/${manufacturerId}/stock-slips`,
      data,
    ),
  update: (slipId: number, data: ManufacturerStockSlipInput) =>
    apiClient.put<ManufacturerStockSlip>(
      `/manufacturers/stock-slips/${slipId}`,
      data,
    ),
  cancel: (slipId: number) =>
    apiClient.post<ManufacturerStockSlip>(
      `/manufacturers/stock-slips/${slipId}/cancel`,
      {},
    ),
};
