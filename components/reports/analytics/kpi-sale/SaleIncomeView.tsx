"use client";

import { CalendarRange, Flag, Target, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import {
  AnalyticsTable,
  type AnalyticsColumn,
} from "@/components/reports/analytics/shared/AnalyticsTable";
import type {
  KpiIncomeRow,
  KpiProductMixCell,
  KpiSaleIncome,
  KpiUser,
} from "@/lib/api/analytics-kpi-sale";
import { KpiMatrix, type MatrixMeasure, type MatrixRow } from "./KpiMatrix";
import { BLANK, fmtDate, num, pct, ty } from "./kpiFormat";

/** Trang Sale Income: 4 thẻ + Bảng Thu Nhập + Bảng Cơ Cấu Sản Phẩm. */
export function SaleIncomeView({ data }: { data: KpiSaleIncome }) {
  const w = data.week;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(208px,1fr))]">
        <KpiCard
          name="KPI Tháng Này"
          value={ty(data.cards.kpi)}
          icon={<Target className="w-[18px] h-[18px]" />}
          iconBg="#E3EEF0"
          iconColor="#1A5F6A"
          accent="#1A5F6A"
        />
        <KpiCard
          name="Doanh Thu Tháng Này"
          value={ty(data.cards.revenue)}
          icon={<TrendingUp className="w-[18px] h-[18px]" />}
          iconBg="#E0F6F9"
          iconColor="#00A5B5"
          accent="#00B7CC"
        />
        <KpiCard
          name="Doanh Thu Tuần Này"
          value={ty(data.cards.weekRevenue)}
          vs={`Tuần ${w.week}: ${fmtDate(w.from).slice(0, 5)} – ${fmtDate(w.to).slice(0, 5)}`}
          icon={<CalendarRange className="w-[18px] h-[18px]" />}
          iconBg="#E6F2F2"
          iconColor="#2E8B8F"
          accent="#2E8B8F"
        />
        <KpiCard
          name="Còn Lại"
          value={ty(data.cards.remain)}
          icon={<Flag className="w-[18px] h-[18px]" />}
          iconBg="#FBF3DF"
          iconColor="#9A7A2A"
          accent="#C9A84C"
        />
      </div>

      <Panel
        title="Bảng Thu Nhập"
        subtitle="KPI tháng, doanh số thực tế và còn lại theo nhân viên phụ trách khách">
        <IncomeTable data={data} />
      </Panel>

      <Panel
        title="Bảng Cơ Cấu Sản Phẩm"
        subtitle="KPI theo nhóm hàng 2026 — bấm vào tháng để xem từng nhóm hàng">
        <ProductMixMatrix cells={data.productMix} users={data.users} />
      </Panel>
    </div>
  );
}

export function IncomeTable({ data }: { data: KpiSaleIncome }) {
  const columns: AnalyticsColumn<
    Partial<KpiIncomeRow> & { kpi: number | null }
  >[] = [
    { key: "name", label: "Nhân Viên" },
    { key: "ym", label: "Tháng", align: "center" },
    {
      key: "kpi",
      label: "KPI Tháng",
      align: "right",
      format: (v) => num(v as number | null),
    },
    {
      key: "revenue",
      label: "Thực Tế",
      align: "right",
      format: (v) => num(v as number | null),
    },
    {
      key: "pct",
      label: "% Hiệu Quả",
      align: "right",
      format: (v) => pct(v as number | null),
    },
    {
      key: "remain",
      label: "Còn Lại",
      align: "right",
      format: (v) => num(v as number | null),
    },
  ];
  return (
    <AnalyticsTable
      columns={columns}
      rows={data.income.rows}
      totals={{ ...data.income.totals, name: "", ym: "" }}
      rowKey={(r) => `${r.code}|${r.ym}`}
      maxHeight={420}
    />
  );
}

/** Bảng Cơ Cấu Sản Phẩm: Tháng › Nhóm hàng × Nhân viên (KPI / Thực Tế / %Hiệu Quả). */
export function ProductMixMatrix({
  cells,
  users,
  rateColor,
}: {
  cells: KpiProductMixCell[];
  users: KpiUser[];
  rateColor?: (v: number | null) => string | undefined;
}) {
  const measures: MatrixMeasure[] = [
    { key: "kpi", label: "KPI", format: num },
    { key: "revenue", label: "Thực Tế", format: num },
    { key: "pct", label: "%Hiệu Quả", format: pct, color: rateColor },
  ];
  const groups = [
    ...users.map((u) => ({ key: u.code, label: u.name })),
    { key: "__total", label: "Tổng" },
  ];
  const { rows, total } = buildMix(cells, (c) => c.group ?? BLANK);
  return (
    <KpiMatrix
      rowHeader="Tháng"
      groups={groups}
      measures={measures}
      rows={rows}
      total={total}
      totalLabel="Tổng"
    />
  );
}

type Acc = Record<string, { kpi: number | null; revenue: number | null }>;

function addTo(acc: Acc, key: string, c: KpiProductMixCell) {
  const a = (acc[key] ??= { kpi: null, revenue: null });
  if (c.kpi !== null) a.kpi = (a.kpi ?? 0) + c.kpi;
  if (c.revenue !== null) a.revenue = (a.revenue ?? 0) + c.revenue;
}

function toCells(acc: Acc): MatrixRow["cells"] {
  const out: MatrixRow["cells"] = {};
  for (const [k, v] of Object.entries(acc)) {
    out[k] = {
      kpi: v.kpi,
      revenue: v.revenue,
      pct: v.kpi ? (v.revenue ?? 0) / v.kpi : null,
    };
  }
  return out;
}

const GROUP_ORDER = (g: string) => (g === BLANK ? "~" : g);

/** Gom ô (nhân viên, tháng, nhóm) thành hàng Tháng › Nhóm + cột nhân viên + cột Tổng. */
export function buildMix(
  cells: KpiProductMixCell[],
  childKey: (c: KpiProductMixCell) => string,
) {
  const months = new Map<string, { acc: Acc; kids: Map<string, Acc> }>();
  const totalAcc: Acc = {};
  for (const c of cells) {
    let m = months.get(c.ym);
    if (!m) {
      m = { acc: {}, kids: new Map() };
      months.set(c.ym, m);
    }
    const ck = childKey(c);
    const kid = m.kids.get(ck) ?? {};
    m.kids.set(ck, kid);
    for (const acc of [m.acc, kid, totalAcc]) {
      addTo(acc, c.code, c);
      addTo(acc, "__total", c);
    }
  }
  const rows: MatrixRow[] = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, m]) => ({
      key: ym,
      label: ym,
      cells: toCells(m.acc),
      children: [...m.kids.entries()]
        .sort(([a], [b]) => GROUP_ORDER(a).localeCompare(GROUP_ORDER(b), "vi"))
        .map(([g, acc]) => ({ key: g, label: g, cells: toCells(acc) })),
    }));
  return {
    rows,
    total: rows.length
      ? { key: "__total", label: "Tổng", cells: toCells(totalAcc) }
      : null,
  };
}
