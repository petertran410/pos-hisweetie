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

export const vehicleScope = (branchId: number) =>
  branchId === 6 ? "hn" : branchId === 1 ? "sg" : null;

export type VehicleAction = "view" | "create" | "update" | "manage";

export const canVehicle = (
  user: { roles?: string[]; permissions?: string[] } | null | undefined,
  action: VehicleAction,
  branchId: number,
) => {
  const scope = vehicleScope(branchId);
  if (!scope) return false;
  if (user?.roles?.includes("Super Admin")) return true;
  return Boolean(user?.permissions?.includes(`vehicles:${action}_${scope}`));
};
