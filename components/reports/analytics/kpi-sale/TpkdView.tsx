"use client";

import { Flag, Percent, Target, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import type { KpiSaleIncome } from "@/lib/api/analytics-kpi-sale";
import { KpiMatrix, type MatrixMeasure, type MatrixRow } from "./KpiMatrix";
import { BLANK, num, pct, rateColor, ty } from "./kpiFormat";
import { buildMix } from "./SaleIncomeView";

/**
 * Trang TPKD (góc nhìn trưởng phòng kinh doanh). Trong Power BI trang này chỉ còn
 * bộ lọc — các bảng "Đánh giá hiệu quả nhân sự theo tháng / nhóm hàng" bị ẩn và
 * trỏ tới bảng không có trong dataset KPI Sale. Ở đây dựng lại các bảng đó trên
 * dữ liệu KPI Sale: thực tế / kế hoạch / % hiệu quả theo nhân viên và nhóm hàng.
 */
export function TpkdView({ data }: { data: KpiSaleIncome }) {
  const t = data.income.totals;
  const rate = t.kpi ? (t.revenue ?? 0) / t.kpi : null;
  const measures: MatrixMeasure[] = [
    { key: "revenue", label: "Thực tế", format: num },
    { key: "kpi", label: "Kế hoạch", format: num },
    { key: "pct", label: "% Hiệu quả", format: pct, color: rateColor },
  ];

  // Theo tháng × nhân viên (kế hoạch = chỉ tiêu doanh số).
  const months = new Map<string, MatrixRow>();
  const total: MatrixRow = { key: "__total", label: "Tổng", cells: {} };
  const add = (
    row: MatrixRow,
    col: string,
    kpi: number | null,
    revenue: number | null,
  ) => {
    const c = (row.cells[col] ??= { kpi: null, revenue: null, pct: null });
    if (kpi !== null) c.kpi = (c.kpi ?? 0) + kpi;
    if (revenue !== null) c.revenue = (c.revenue ?? 0) + revenue;
    c.pct = c.kpi ? (c.revenue ?? 0) / c.kpi : null;
  };
  for (const r of data.income.rows) {
    let m = months.get(r.ym);
    if (!m) {
      m = { key: r.ym, label: r.ym, cells: {} };
      months.set(r.ym, m);
    }
    for (const row of [m, total]) {
      add(row, r.code, r.kpi, r.revenue);
      add(row, "__total", r.kpi, r.revenue);
    }
  }
  const monthRows = [...months.values()].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const groups = [
    ...data.users.map((u) => ({ key: u.code, label: u.name })),
    { key: "__total", label: "Cả phòng" },
  ];

  // Theo nhóm hàng (cả phòng): kế hoạch = chỉ tiêu nhóm hàng.
  const mix = buildMix(data.productMix, (c) => c.group ?? BLANK);
  const mixMeasures: MatrixMeasure[] = [
    { key: "revenue", label: "Thực tế", format: num },
    { key: "kpi", label: "Kế hoạch", format: num },
    { key: "pct", label: "% Hiệu quả", format: pct, color: rateColor },
  ];
  const onlyTotal = (r: MatrixRow): MatrixRow => ({
    ...r,
    cells: { "": r.cells.__total ?? {} },
    children: r.children?.map(onlyTotal),
  });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(208px,1fr))]">
        <KpiCard
          name="Kế hoạch (cả phòng)"
          value={ty(t.kpi)}
          icon={<Target className="w-[18px] h-[18px]" />}
          iconBg="#E3EEF0"
          iconColor="#1A5F6A"
          accent="#1A5F6A"
        />
        <KpiCard
          name="Thực tế"
          value={ty(t.revenue)}
          icon={<TrendingUp className="w-[18px] h-[18px]" />}
          iconBg="#E0F6F9"
          iconColor="#00A5B5"
          accent="#00B7CC"
        />
        <KpiCard
          name="% Hiệu quả"
          value={rate === null ? "—" : pct(rate)}
          icon={<Percent className="w-[18px] h-[18px]" />}
          iconBg="#E6F2F2"
          iconColor="#2E8B8F"
          accent={rateColor(rate) ?? "#2E8B8F"}
        />
        <KpiCard
          name="Còn Lại"
          value={ty(t.remain)}
          icon={<Flag className="w-[18px] h-[18px]" />}
          iconBg="#FBF3DF"
          iconColor="#9A7A2A"
          accent="#C9A84C"
        />
      </div>

      <Panel
        title="Đánh giá hiệu quả nhân sự theo tháng"
        subtitle="Thực tế so với chỉ tiêu doanh số — đỏ: dưới 100%, xanh: vượt 100%">
        <KpiMatrix
          rowHeader="Tháng"
          groups={groups}
          measures={measures}
          rows={monthRows}
          total={monthRows.length ? total : null}
        />
      </Panel>

      <Panel
        title="Kết quả doanh số theo từng nhóm hàng"
        subtitle="Cả phòng — bấm vào tháng để xem từng nhóm hàng 2026">
        <KpiMatrix
          rowHeader="Tháng › Nhóm hàng"
          groups={[]}
          measures={mixMeasures}
          rows={mix.rows.map(onlyTotal)}
          total={mix.total ? onlyTotal(mix.total) : null}
        />
      </Panel>
    </div>
  );
}
