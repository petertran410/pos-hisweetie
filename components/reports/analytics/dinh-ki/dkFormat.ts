// Định dạng số + màu theo điều kiện cho các trang Định Kì / Hằng Tuần
// (chép từ các measure HTML của Power BI: FORMAT(...,"#,0.0") & " tỷ", ▲/▼, màu %KPI).

const nf = (v: number, digits: number) =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** "12,3 tỷ" */
export function fmtTy(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${nf(v / 1e9, digits)} tỷ`;
}

/** "123 tr" */
export function fmtTr(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${nf(v / 1e6, digits)} tr`;
}

/** 0.123 → "12,3%" ; null → "—" */
export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${nf(v * 100, digits)}%`;
}

export function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return Math.round(v).toLocaleString("vi-VN");
}

/** Tăng trưởng (a - b) / b; null nếu b = 0 (DIVIDE của DAX). */
export function change(cur: number, prev: number): number | null {
  return prev ? (cur - prev) / prev : null;
}

export const DK = {
  good: "#0F6E56",
  goodBg: "#E8F6EE",
  warn: "#854F0B",
  warnBg: "#FDF1E6",
  bad: "#A32D2D",
  badBg: "#FCEAEA",
  bar: "#12239E",
  barBg: "#EDF1F3",
  lermao: "#E66C37",
  lermaoBg: "#FBE6DA",
  boduo: "#12239E",
  boduoBg: "#E5E8F5",
  chuoi: "#608BC1",
  muted: "#8C897D",
};

/** Màu % KPI như Power BI: ≥ 100% xanh, ≥ 80% nâu, còn lại đỏ. */
export function kpiTone(p: number | null | undefined) {
  if (p === null || p === undefined) return { fg: DK.muted, bg: "#F1F3F4" };
  if (p >= 1) return { fg: DK.good, bg: DK.goodBg };
  if (p >= 0.8) return { fg: DK.warn, bg: DK.warnBg };
  return { fg: DK.bad, bg: DK.badBg };
}

/** ▲ / ▼ + màu cho tăng trưởng (null → coi như ≥ 0 như DAX: BLANK >= 0). */
export function trend(v: number | null | undefined) {
  const up = v === null || v === undefined || v >= 0;
  return { arrow: up ? "▲" : "▼", color: up ? DK.good : DK.bad };
}

// ── Ngày 'YYYY-MM-DD' (không múi giờ) ───────────────────────────────────────
const toUtc = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fromUtc = (dt: Date) => dt.toISOString().slice(0, 10);

export function addDaysIso(iso: string, n: number): string {
  const dt = toUtc(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

export function addMonthsIso(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  return fromUtc(new Date(Date.UTC(y, m - 1 + n, 1)));
}

/** dd/MM/yyyy */
export function fmtDate(iso: string): string {
  return iso.split("-").reverse().join("/");
}

/** dd/MM */
export function fmtDm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** MM/yyyy */
export function fmtMonth(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** Năm / tháng hiện tại theo giờ Việt Nam (dùng làm giá trị khởi tạo của bộ lọc). */
export function vnNow(): { y: number; m: number } {
  const vn = new Date(new Date().getTime() + 7 * 3600e3);
  return { y: vn.getUTCFullYear(), m: vn.getUTCMonth() + 1 };
}
