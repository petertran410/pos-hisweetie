// Giữ khớp với src/vehicles/vehicles.constants.ts và
// src/internal-finance/internal-finance.constants.ts ở backend.

export const VEHICLE_SERVICE = {
  REGISTRATION: "Đăng kiểm xe",
  INSURANCE: "Mua bảo hiểm bắt buộc",
  OIL_CHANGE: "Thay nhớt",
} as const;

export const VEHICLE_SERVICE_TYPES = [
  "Rửa xe",
  "Bảo dưỡng",
  VEHICLE_SERVICE.OIL_CHANGE,
  "Sửa chữa",
  "Chăm sóc xe",
  VEHICLE_SERVICE.REGISTRATION,
  VEHICLE_SERVICE.INSURANCE,
  "Phạt nguội",
  "Phạt nóng",
  "Mua đường",
] as const;

export const VEHICLE_ATTACHMENT_KIND = {
  PUMP_METER: "PUMP_METER",
  INVOICE: "INVOICE",
  PHOTO: "PHOTO",
  EVIDENCE: "EVIDENCE",
} as const;

export const VEHICLE_BRANCH_IDS = [6, 1];

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  CAR: "Ô tô",
  MOTORBIKE: "Xe máy",
};

export const FUEL_TYPE_LABELS: Record<string, string> = {
  GASOLINE: "Xăng",
  DIESEL: "Dầu",
};

export const WAREHOUSE_EXPENSE_ITEMS = [
  "Chi phí tiền lương CBNV",
  "Cước chuyển phát nhanh tài liệu, chứng từ - đơn hàng bán lẻ",
  "Chi phí điện sinh hoạt",
  "Điện nước",
  "Cước điện thoại di động",
  "Chi phí nước uống, nước sinh hoạt",
  "Chi phí văn phòng phẩm, đồ dùng văn phòng",
  "Mua sắm CCDC, thiết bị văn phòng",
  "Chi phí sửa chữa thiết bị văn phòng",
  "Mua sắm TSCĐ",
  "Cước đường bộ, vé gửi xe:",
  "Sửa chữa, bảo dưỡng; oto xe máy",
  "Xăng xe: oto, xe tại kho",
  "Chi phí ngoại giao ( xử lý )",
  "Chi phí bốc xếp hàng hóa tại kho",
  "Cước gửi hàng cho khách: cước chành xe, ship nội thành",
  "Mua bao bì, CCDC phục vụ đóng gói hàng hóa: carton, xốp, băng keo...",
  "Thanh toán công nợ NCC",
  "Khác",
] as const;

export const ENTRY_STATUS_LABELS: Record<string, string> = {
  PENDING_ACCOUNTANT: "Chờ kế toán",
  ACCOUNTANT_APPROVED: "Kế toán đã duyệt",
  PENDING_MANAGER: "Chờ quản lý",
  MANAGER_APPROVED: "Quản lý đã duyệt",
  READY_FOR_WEEKLY_APPROVAL: "Sẵn sàng tổng hợp",
  IN_WEEKLY_APPROVAL: "Đang duyệt",
  APPROVED: "Đã duyệt",
  POSTED: "Đã ghi sổ",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

const OPEN_STATUSES = [
  "PENDING_ACCOUNTANT",
  "ACCOUNTANT_APPROVED",
  "PENDING_MANAGER",
  "MANAGER_APPROVED",
];

/** Phiếu còn sửa/hủy được: chưa vào batch tuần, chưa chi (khớp khóa ở backend). */
export const isExpenseOpenForEdit = (entry: {
  status: string;
  cashIssued?: boolean;
  weeklyBatch?: unknown;
  cashFlow?: unknown;
}) =>
  OPEN_STATUSES.includes(entry.status) &&
  !entry.cashIssued &&
  !entry.weeklyBatch &&
  !entry.cashFlow;

type LockableEntry = {
  status: string;
  sourceType: string;
  category: string;
  cashIssued?: boolean;
  cashFlow?: unknown;
  weeklyBatch?: { code: string; status: string } | null;
};

/** Phiếu xe tạo trên POS hoặc chuyển từ Lark (cùng loại xăng/chăm sóc xe). */
const isVehicleSource = (entry: LockableEntry) =>
  ["FUEL", "VEHICLE_CARE"].includes(entry.sourceType) ||
  (entry.sourceType === "LARK_IMPORT" &&
    ["FUEL", "VEHICLE_CARE"].includes(entry.category));

function lockReason(entry: LockableEntry, allowReadyBatch: boolean) {
  if (!isVehicleSource(entry)) return "Phiếu không thuộc Xe cộ.";
  if (entry.status === "CANCELLED") return "Phiếu đã hủy.";
  if (entry.cashIssued || entry.cashFlow) return "Phiếu đã chi.";
  if (entry.weeklyBatch) {
    if (entry.weeklyBatch.status !== "READY")
      return `Phiếu đang trong Approval tuần ${entry.weeklyBatch.code} đã gửi duyệt.`;
    if (!allowReadyBatch)
      return `Phiếu đang trong Approval tuần ${entry.weeklyBatch.code} (chưa gửi Lark): bỏ tick Quản lý kho/Kế toán kho ở Phiếu chi kho hoặc hủy batch để sửa.`;
  }
  if (!allowReadyBatch && !OPEN_STATUSES.includes(entry.status))
    return "Phiếu đã kết thúc, không sửa được.";
  return null;
}

/** Lý do không sửa được phiếu xe (null: sửa được). Khớp khóa ở backend. */
export const vehicleEditBlockReason = (
  entry: LockableEntry,
  canUpdate: boolean,
) =>
  lockReason(entry, false) ??
  (canUpdate ? null : "Không có quyền Chỉnh sửa Xe cộ ở kho này.");

/** Lý do không hủy được: phiếu trong batch chưa gửi Lark vẫn hủy được (tự gỡ ra). */
export const vehicleCancelBlockReason = (
  entry: LockableEntry,
  canUpdate: boolean,
) =>
  lockReason(entry, true) ??
  (canUpdate ? null : "Không có quyền Chỉnh sửa Xe cộ ở kho này.");

export const vehicleScope = (branchId: number) =>
  branchId === 6 ? "hn" : branchId === 1 ? "sg" : null;

export type VehicleAction = "view" | "create" | "update" | "manage";

/** Quyền xe cộ theo vai trò × chi nhánh (xem useFinanceAccess). */
export const canVehicle = (
  access: {
    can: (resource: string, action: string, branchId: number) => boolean;
  },
  action: VehicleAction,
  branchId: number,
) =>
  vehicleScope(branchId) !== null && access.can("vehicles", action, branchId);
