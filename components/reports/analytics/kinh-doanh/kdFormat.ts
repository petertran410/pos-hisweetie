// Định dạng số / màu cho các trang Kinh Doanh (theo các measure HTML & màu của Power BI).

const nf = (v: number, min: number, max: number) =>
  v.toLocaleString("vi-VN", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });

/** FORMAT(x/1e9, "#,0.00") & " tỷ" */
export const ty = (v: number, digits = 2) =>
  `${nf(v / 1e9, digits, digits)} tỷ`;
/** FORMAT(x/1e6, "#,0") & " tr" */
export const tr = (v: number, digits = 0) =>
  `${nf(v / 1e6, digits, digits)} tr`;
export const int = (v: number) => nf(Math.round(v), 0, 0);
/** FORMAT(x, "0.0%") */
export const pct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : `${nf(v * 100, digits, digits)}%`;
export const signedPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : `${v >= 0 ? "+" : ""}${nf(v * 100, digits, digits)}%`;
/** Số đầy đủ kiểu Power BI (x.xxx.xxx). */
export const full = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : nf(Math.round(v), 0, 0);
/** "x,xx Tỷ" / "x,xx Triệu" (switch_dynamics_metrics_label). */
export const tyTrieu = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${nf(v / 1e9, 2, 2)} Tỷ`;
  if (a >= 1e6) return `${nf(v / 1e6, 2, 2)} Triệu`;
  return nf(Math.round(v), 0, 0);
};

export const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
export const fmtRange = (r: { from: string; to: string }) =>
  `${fmtDate(r.from).slice(0, 5)} – ${fmtDate(r.to)}`;

// Màu dùng trong các trang HTML của Power BI
export const C = {
  primary: "#12239E",
  accent: "#E66C37",
  warn: "#A32D2D",
  ok: "#0F6E56",
  amber: "#854F0B",
  muted: "#5A584F",
  line: "#E7E4DA",
  track: "#F1EFE8",
};

/** % KPI: ≥100% xanh, ≥80% vàng, còn lại đỏ. */
export const rateColor = (r: number | null | undefined) =>
  r === null || r === undefined
    ? C.muted
    : r >= 1
      ? C.ok
      : r >= 0.8
        ? C.amber
        : C.warn;
export const rateBg = (r: number | null | undefined) =>
  r === null || r === undefined
    ? "#F1EFE8"
    : r >= 1
      ? "#E8F6EE"
      : r >= 0.8
        ? "#FDF1E6"
        : "#FCEAEA";
export const growthColor = (g: number | null | undefined) =>
  g === null || g === undefined ? C.muted : g >= 0 ? C.ok : C.warn;
export const arrow = (g: number | null | undefined) =>
  g === null || g === undefined ? "" : g >= 0 ? "▲" : "▼";

/** Color for MoM Growth (%) / Color for Target (%) của Power BI. */
export const pbiGrowthColor = (g: number | null | undefined) =>
  g === null || g === undefined || !Number.isFinite(g)
    ? undefined
    : g < 0
      ? "#EB5757"
      : g === 0
        ? "#F2C94C"
        : "#27AE60";
/** Màu theo tỷ lệ đạt kế hoạch (<1 đỏ, =1 vàng, >1 xanh). */
export const pbiTargetColor = (r: number | null | undefined) =>
  r === null || r === undefined || !Number.isFinite(r)
    ? undefined
    : r < 1
      ? "#EB5757"
      : r === 1
        ? "#F2C94C"
        : "#27AE60";
