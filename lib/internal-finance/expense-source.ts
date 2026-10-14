import type { InternalFinanceEntry } from "@/lib/api/internal-finance";

export type ExpenseSourceAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "edit"; label: string }
  | { kind: "none"; label: string };

/**
 * Nơi sửa chứng từ của phiếu chi: báo đơn và phiếu xe sửa ở trang gốc (lưu lại
 * thì phiếu chi tự cập nhật), phiếu tay sửa ngay ở Phiếu chi kho.
 */
export function expenseSourceAction(
  entry: Pick<
    InternalFinanceEntry,
    "code" | "sourceType" | "category" | "packingSlip"
  >,
): ExpenseSourceAction {
  if (entry.packingSlip?.code) {
    return {
      kind: "link",
      label: "Sửa chứng từ ở Báo đơn",
      href: `/don-hang/bao-don?Code=${encodeURIComponent(entry.packingSlip.code)}`,
    };
  }
  // Phiếu xe tạo trên POS hoặc chuyển từ Lark đều sửa ở trang Xe cộ.
  if (
    (entry.category === "FUEL" || entry.category === "VEHICLE_CARE") &&
    ["FUEL", "VEHICLE_CARE", "LARK_IMPORT"].includes(entry.sourceType)
  ) {
    return {
      kind: "link",
      label: "Sửa ở Xe cộ",
      href: `/tai-chinh/xe-co?Code=${encodeURIComponent(entry.code)}&kind=${entry.category}`,
    };
  }
  if (entry.sourceType === "MANUAL_EXPENSE") {
    return { kind: "edit", label: "Sửa phiếu" };
  }
  return { kind: "none", label: "Dữ liệu cũ, không sửa chứng từ" };
}

/** Vì sao phiếu chi chưa sửa được (null: sửa được ở nguồn). */
export function expenseLockReason(
  entry: Pick<
    InternalFinanceEntry,
    "status" | "cashIssued" | "cashFlow" | "weeklyBatch"
  >,
): string | null {
  if (entry.status === "CANCELLED") return "Phiếu chi đã hủy.";
  if (entry.cashIssued || entry.cashFlow)
    return "Phiếu đã chi: không sửa được chứng từ.";
  if (entry.weeklyBatch) {
    return entry.weeklyBatch.status === "READY"
      ? `Phiếu đang trong Approval tuần ${entry.weeklyBatch.code} (chưa gửi Lark): bỏ tick Quản lý kho/Kế toán kho hoặc hủy batch để sửa.`
      : `Phiếu đang trong Approval tuần ${entry.weeklyBatch.code} đã gửi duyệt: không sửa được.`;
  }
  return null;
}
