/**
 * Văn phòng HN (4) và Văn phòng SG (7): không có báo đơn, xe, tick kiểm tra hay
 * Approval tuần. Phiếu chi văn phòng sinh từ đơn PHIẾU CHI Lark đã duyệt.
 */
export const OFFICE_BRANCH_IDS = [4, 7];

export const isOfficeBranch = (branchId?: number | null) =>
  branchId != null && OFFICE_BRANCH_IDS.includes(branchId);

export interface OfficeVoucherDetails {
  method: string | null;
  cashSource: string | null;
  expenseType: string | null;
  expenseItem: string | null;
  department: string | null;
  supplier: string | null;
  totalAmount: number | null;
  cashAmount: number | null;
  transferAmount: number | null;
}

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;

/** Thông tin đơn PHIẾU CHI Lark lưu kèm phiếu (từ `sourceSnapshot`). */
export function officeVoucherDetails(
  snapshot?: Record<string, unknown> | null,
): OfficeVoucherDetails {
  const s = snapshot || {};
  return {
    method: text(s.method),
    cashSource: text(s.cashSource),
    expenseType: text(s.expenseType),
    expenseItem: text(s.expenseItem),
    department: text(s.department),
    supplier: text(s.supplier),
    totalAmount: number(s.totalAmount),
    cashAmount: number(s.cashAmount),
    transferAmount: number(s.transferAmount),
  };
}
