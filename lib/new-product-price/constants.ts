import type {
  NppCostGroupKey,
  NppGroup,
  NppPriceTargetKey,
  NppStage,
  NppStatus,
} from "@/lib/types/new-product-price";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const NPP_STAGE_ORDER: NppStage[] = [
  "PROPOSAL",
  "PURCHASING",
  "ACCOUNTING",
  "SALES",
  "CEO",
  "DATA",
  "DONE",
];

export const NPP_STAGE_LABEL: Record<NppStage, string> = {
  PROPOSAL: "Đề xuất",
  PURCHASING: "Phòng Thu Mua",
  ACCOUNTING: "Phòng Kế Toán",
  SALES: "Phòng Kinh Doanh",
  CEO: "CEO",
  DATA: "Phòng Dữ Liệu",
  DONE: "Hoàn thành",
  ENDED: "Đã kết thúc",
};

export const NPP_STAGE_COLOR: Record<NppStage, string> = {
  PROPOSAL: "bg-gray-100 text-gray-700",
  PURCHASING: "bg-amber-100 text-amber-700",
  ACCOUNTING: "bg-amber-100 text-amber-700",
  SALES: "bg-amber-100 text-amber-700",
  CEO: "bg-amber-100 text-amber-700",
  DATA: "bg-brand-soft text-brand-dark",
  DONE: "bg-green-100 text-green-700",
  ENDED: "bg-gray-100 text-gray-500",
};

export const NPP_STATUS_LABEL: Record<NppStatus, string> = {
  UNDER_REVIEW: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export const NPP_STATUS_COLOR: Record<NppStatus, string> = {
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export const NPP_GROUP_LABEL: Record<NppGroup, string> = {
  PURCHASING: "Phòng Thu Mua",
  ACCOUNTING: "Phòng Kế Toán",
  CHIEF_ACCOUNTANT: "Kế toán trưởng",
  SALES: "Phòng Kinh Doanh",
  CEO: "CEO",
  DATA: "Phòng Dữ Liệu",
};

export const NPP_GROUP_HINT: Record<NppGroup, string> = {
  PURCHASING:
    "Nhận đề xuất, nhập chi phí thu mua (cùng người duyệt giá cost của phiếu)",
  ACCOUNTING: "Nhập giá vốn HN / SG / CH Diệp Trà",
  CHIEF_ACCOUNTANT: "Duyệt giá vốn khi Kế toán gửi",
  SALES: "Nhập giá bán",
  CEO: "Duyệt bảng giá",
  DATA: "Áp dụng tạo sản phẩm mới (tạo được hàng hóa kể cả khi không có quyền tạo hàng hóa)",
};

export const NPP_PRICE_TARGET_LABEL: Record<NppPriceTargetKey, string> = {
  HN_RETAIL: "HN - Giá Lẻ",
  HN_WHOLESALE: "HN - Giá Buôn",
  SG_RETAIL: "SG - Giá Lẻ",
  SG_WHOLESALE: "SG - Giá Buôn",
  DLCL: "Giá ĐLCL",
  SHOPEE: "Giá Shopee",
};

export const NPP_COST_GROUP_LABEL: Record<NppCostGroupKey, string> = {
  HN: "Giá vốn Hà Nội",
  SG: "Giá vốn Sài Gòn",
  DT: "Giá vốn CH Diệp Trà",
};

export const MANUFACTURED_PARENT = "Hàng sản xuất";
export const DOMESTIC_ORIGIN = "Nội địa";

export function isManufactured(parentName?: string | null) {
  return (
    (parentName ?? "").trim().toLowerCase() ===
    MANUFACTURED_PARENT.toLowerCase()
  );
}

export function isDomestic(origin?: string | null) {
  return (origin ?? "").trim().toLowerCase() === DOMESTIC_ORIGIN.toLowerCase();
}

export function options<T extends string>(map: Record<T, string>) {
  return (Object.keys(map) as T[]).map((value) => ({
    value,
    label: map[value],
  }));
}

/** Số tiền làm tròn đồng, kiểu en-US (lib/utils formatCurrency): 108,000 đ. */
export const fmtMoney = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : `${formatCurrency(Math.round(v))} đ`;

export const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

export const fmtDateTime = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

/** Tỷ lệ 0.125 → "12.5%" (lib/utils formatNumber, en-US). */
export const fmtPercent = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : `${formatNumber(v * 100, "en-US", { max: 1 })}%`;

export const nppHref = (code: string) =>
  `/san-pham/bang-gia-san-pham-moi?Code=${encodeURIComponent(code)}`;
