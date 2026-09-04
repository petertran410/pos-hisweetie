/**
 * Calculation Logic — Module Dự kiến chuyển kho (Hà Nội → Sài Gòn)
 *
 * Quy tắc:
 * 1. BQ5/ngày = Bán 5 ngày / 5
 * 2. BQ30/ngày = Bán 30 ngày / 30
 * 3. BQ90/ngày = Bán 90 ngày / 90
 * 4. Demand/ngày = 60% × BQ5/ngày + 30% × BQ30/ngày + 10% × BQ90/ngày
 * 5. Tồn an toàn = Demand/ngày × 2 (2 ngày an toàn)
 * 6. Điểm điều chuyển = Tồn an toàn + Demand/ngày × Leadtime
 *    - Hàng thường: Leadtime = 5 ngày
 *    - Hàng lạnh:   Leadtime = 3 ngày (giảm 2 ngày)
 * 7. Tồn khả dụng SG = Tồn SG + Đang chuyển nội bộ - Đơn tạm - Đơn xác nhận
 * 8. Tồn mục tiêu = Tồn an toàn + Demand/ngày × Chu kỳ
 *    - Hàng thường: Chu kỳ = 7 ngày
 *    - Hàng lạnh:   Chu kỳ = 5 ngày (giảm 2 ngày)
 * 9. SL đề xuất = MAX(0, Tồn mục tiêu - Tồn khả dụng SG)
 *
 * Cảnh báo:
 * - CHUYỂN GẤP (màu đỏ đậm): Đơn tạm + Đơn xác nhận > Tồn khả dụng SG
 * - Cần điều chuyển (màu đỏ): Tồn khả dụng SG ≤ Điểm điều chuyển
 * - Cần xem xét (màu vàng): Tồn khả dụng SG ≤ Tồn mục tiêu
 * - Đủ hàng (màu xanh): Tồn khả dụng SG > Tồn mục tiêu
 */

import type { AlertLevel, CalculationTrace } from "@/lib/types/transfer-planning";

export interface TransferPlanningInputs {
  stockHN: number;
  stockSG: number;
  sales5: number;
  sales30: number;
  sales90: number;
  inTransit: number;
  committed: number;
  confirmedOrders: number;
  cargoType?: "COLD" | "NORMAL";
  packSize?: number;
}

export function calculateTransferPlanning(
  inputs: TransferPlanningInputs
): CalculationTrace {
  const sales5 = Math.max(0, Number(inputs.sales5) || 0);
  const sales30 = Math.max(0, Number(inputs.sales30) || 0);
  const sales90 = Math.max(0, Number(inputs.sales90) || 0);
  const stockSG = Math.max(0, Number(inputs.stockSG) || 0);
  const inTransit = Math.max(0, Number(inputs.inTransit) || 0);
  const committed = Math.max(0, Number(inputs.committed) || 0);
  const confirmedOrders = Math.max(0, Number(inputs.confirmedOrders) || 0);

  const avg5PerDay = sales5 / 5;
  const avg30PerDay = sales30 / 30;
  const avg90PerDay = sales90 / 90;

  const demandPerDay = 0.6 * avg5PerDay + 0.3 * avg30PerDay + 0.1 * avg90PerDay;
  const safetyStock = demandPerDay * 2;

  const isCold = inputs.cargoType === "COLD";
  const leadtimeDays = isCold ? 3 : 5;
  const cycleDays = isCold ? 5 : 7;

  const transferPoint = safetyStock + demandPerDay * leadtimeDays;
  const availableStockSG = stockSG + inTransit - committed - confirmedOrders;
  const targetStockSG = safetyStock + demandPerDay * cycleDays;
  const suggestedQuantity = (() => {
    const rawSuggested = Math.max(0, targetStockSG - availableStockSG);
    const ps = inputs.packSize && inputs.packSize > 1 ? inputs.packSize : 1;
    return Math.round(rawSuggested / ps) * ps;
  })();

  let alert: AlertLevel = "GREEN";
  let alertLabel = "Đủ hàng";
  let alertReason = "Đủ hàng";

  if (committed + confirmedOrders > availableStockSG) {
    alert = "DARK_RED";
    alertLabel = "CHUYỂN GẤP";
    alertReason = "Đơn tạm + Đơn xác nhận > tồn khả dụng";
  } else if (availableStockSG <= transferPoint && suggestedQuantity > 0) {
    alert = "RED";
    alertLabel = "Cần điều chuyển";
    alertReason = "Tồn khả dụng ≤ điểm điều chuyển";
  } else if (availableStockSG <= targetStockSG && suggestedQuantity > 0) {
    alert = "YELLOW";
    alertLabel = "Cần xem xét";
    alertReason = "Cần xem xét";
  } else {
    alert = "GREEN";
    alertLabel = "Đủ hàng";
    alertReason = "Đủ hàng";
  }

  return {
    avg5PerDay,
    avg30PerDay,
    avg90PerDay,
    demandPerDay,
    safetyStock,
    leadtimeDays,
    cycleDays,
    transferPoint,
    availableStockSG,
    availableDays: demandPerDay > 0 ? Math.round(availableStockSG / demandPerDay) : 0,
    targetStockSG,
    suggestedQuantity,
    alert,
    alertLabel,
    alertReason,
  };
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWholeQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}
