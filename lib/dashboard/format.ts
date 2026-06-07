// Định dạng số cho dashboard — input là VND thực tế từ backend.

/** Rút gọn tiền tệ VND: tỷ / tr / k. */
export function money(vnd: number): string {
  const abs = Math.abs(vnd);
  if (abs >= 1_000_000_000) {
    return (
      (vnd / 1_000_000_000).toLocaleString("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " tỷ"
    );
  }
  if (abs >= 1_000_000) {
    return (
      (vnd / 1_000_000).toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
      }) + " tr"
    );
  }
  if (abs >= 1_000) {
    return Math.round(vnd / 1_000).toLocaleString("vi-VN") + "k";
  }
  return Math.round(vnd).toLocaleString("vi-VN");
}

/** Rút gọn cho trục biểu đồ. */
export function moneyAxis(vnd: number): string {
  const abs = Math.abs(vnd);
  if (abs >= 1_000_000_000) return (vnd / 1_000_000_000).toFixed(1) + "tỷ";
  if (abs >= 1_000_000) return (vnd / 1_000_000).toFixed(0) + "tr";
  if (abs >= 1_000) return (vnd / 1_000).toFixed(0) + "k";
  return String(Math.round(vnd));
}

export function vi(n: number): string {
  return Math.round(n).toLocaleString("vi-VN");
}

/** % kiểu Việt, tối đa 1 chữ số thập phân: 48.4 → "48,4%". */
export function pct(n: number): string {
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "%";
}

/** % delta có dấu, format kiểu +12,4%. */
export function deltaPct(n: number): string {
  const s = n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  return (n >= 0 ? "+" : "") + s + "%";
}

export function timeAgo(dateStr: string | Date): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export const DT_COLORS = {
  primary: "#00B7CC",
  primaryBright: "#00A5B5",
  primaryMid: "#2E8B8F",
  primaryDeep: "#1A5F6A",
  primaryDark: "#0D3B42",
  cyanSoft: "#A8D8E0",
  gold: "#C9A84C",
  goldDark: "#9A7A2A",
  success: "#2E8B8F",
  warning: "#C9A84C",
  error: "#C0392B",
};

/** Bảng màu xoay vòng cho các chi nhánh trong biểu đồ so sánh. */
export const BRANCH_PALETTE = [
  "#00B7CC",
  "#2E8B8F",
  "#1A5F6A",
  "#C9A84C",
  "#00A5B5",
  "#A8D8E0",
  "#0D3B42",
];

export const CATEGORY_PALETTE = [
  "#00B7CC",
  "#2E8B8F",
  "#1A5F6A",
  "#C9A84C",
  "#A8D8E0",
  "#00A5B5",
  "#7AA5A8",
  "#E8C96A",
];
