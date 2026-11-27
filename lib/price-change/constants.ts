import type { PcGroup, PcStage, PcStatus } from "@/lib/types/price-change";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const PC_STAGE_LABEL: Record<PcStage, string> = {
  PROPOSAL: "Đề xuất",
  CHIEF_ACCOUNTANT: "Kế toán trưởng",
  CEO: "CEO",
  DATA: "Phòng Dữ Liệu",
  DONE: "Hoàn thành",
  ENDED: "Đã kết thúc",
};

/** Thứ tự đầy đủ (phiếu chỉ đổi giá bán bỏ qua CEO). */
export const PC_STAGE_ORDER: PcStage[] = [
  "PROPOSAL",
  "CHIEF_ACCOUNTANT",
  "CEO",
  "DATA",
  "DONE",
];

export const PC_STAGE_COLOR: Record<PcStage, string> = {
  PROPOSAL: "bg-gray-100 text-gray-700",
  CHIEF_ACCOUNTANT: "bg-amber-100 text-amber-700",
  CEO: "bg-amber-100 text-amber-700",
  DATA: "bg-brand-soft text-brand-dark",
  DONE: "bg-green-100 text-green-700",
  ENDED: "bg-gray-100 text-gray-500",
};

export const PC_STATUS_LABEL: Record<PcStatus, string> = {
  UNDER_REVIEW: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export const PC_STATUS_COLOR: Record<PcStatus, string> = {
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export const PC_TYPE_LABEL = { COST: "Giá vốn", SALE: "Giá bán" } as const;

export const PC_GROUP_LABEL: Record<PcGroup, string> = {
  CHIEF_ACCOUNTANT: "Kế toán trưởng",
  CEO: "CEO",
  DATA: "Phòng Dữ Liệu",
};

export const PC_GROUP_HINT: Record<PcGroup, string> = {
  CHIEF_ACCOUNTANT: "Duyệt mọi phiếu thay đổi giá (bước đầu tiên sau đề xuất)",
  CEO: "Duyệt phiếu có đổi giá vốn (phiếu chỉ đổi giá bán bỏ qua CEO)",
  DATA: "Áp dụng giá mới lên POS (ghi được kể cả khi không có quyền sửa hàng hóa)",
};

export const pcHref = (code: string) =>
  `/san-pham/thay-doi-gia?Code=${encodeURIComponent(code)}`;

/** Số tiền làm tròn đồng, kiểu en-US (lib/utils formatCurrency). */
export const fmtMoney = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : formatCurrency(Math.round(v));

export const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("vi-VN") : "—";

export const fmtDateTime = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

export interface CellDiff {
  diff: number | null;
  ratio: number | null;
}

/** Chênh lệch giá cũ → mới; tỷ lệ = (mới − cũ) / cũ (như cột "Tỷ lệ" trên Lark). */
export function cellDiff(
  oldValue: number | null | undefined,
  newValue: number | null | undefined,
): CellDiff {
  if (
    newValue === null ||
    newValue === undefined ||
    oldValue === null ||
    oldValue === undefined
  )
    return { diff: null, ratio: null };
  return {
    diff: newValue - oldValue,
    ratio: oldValue === 0 ? null : (newValue - oldValue) / oldValue,
  };
}

/** "+10%" / "-2.5%" (lib/utils formatNumber, en-US). */
export const fmtRatio = (r: number | null) =>
  r === null
    ? ""
    : `${r > 0 ? "+" : ""}${formatNumber(r * 100, "en-US", { max: 1 })}%`;
