"use client";

import { useMemo } from "react";
import {
  Banknote,
  ShoppingCart,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type {
  QtCustomers,
  QtCustomerTypeValues,
  QtMetric,
} from "@/lib/api/analytics-quan-tri";
import { money, vi } from "@/lib/dashboard/format";
import { AnalyticsTable, type AnalyticsColumn } from "../shared/AnalyticsTable";
import { Panel } from "../shared/AnalyticsCharts";
import { QtDonut, QtHBar, QtStacked100 } from "./QtCharts";
import { QtMonthPivot, collectMonths } from "./QtMonthPivot";
import { TONES } from "./QtOverview";
import { BLANK, num, pct2, qtLabel, qtMetricTitle } from "./qtFormat";

const STATUS_COLORS: Record<string, string> = {
  "New Customer": "#00B7CC",
  "Repeat Customer": "#2E8B8F",
  "Reacquired Customer": "#C9A84C",
};
const TYPE_ORDER = ["Khách buôn", "Khách chuỗi", "Khách lẻ"];

const ico = (C: typeof Users) => <C className="w-[18px] h-[18px]" />;

type TypeRow = QtCustomerTypeValues & { key: string };

export function QtCustomersView({
  data,
  metric,
}: {
  data: QtCustomers;
  metric: QtMetric;
}) {
  const c = data.cards;
  const fmt = (v: number) => qtLabel(v, metric);
  const m = qtMetricTitle(metric);
  const monthGroups = (data.period?.months ?? []).map((x) => `Tháng ${x}`);

  const stacked = (
    list: { month: number; key: string | null; value: number }[] = [],
  ) => {
    const map = new Map<string, number>();
    for (const r of list)
      map.set(`Tháng ${r.month}\u0001${r.key ?? BLANK}`, r.value);
    return (g: string, s: string) => map.get(`${g}\u0001${s}`) ?? 0;
  };
  const statuses = ["New Customer", "Repeat Customer", "Reacquired Customer"];

  const typeRegion = useMemo(() => {
    const map = new Map<string, number>();
    const regions = new Set<string>();
    for (const r of data.byTypeRegion ?? []) {
      const reg = r.region ?? BLANK;
      regions.add(reg);
      map.set(`${r.customerType ?? BLANK}\u0001${reg}`, r.value ?? 0);
    }
    return {
      regions: [...regions].sort((a, b) => a.localeCompare(b, "vi")),
      value: (g: string, s: string) => map.get(`${g}\u0001${s}`) ?? 0,
    };
  }, [data.byTypeRegion]);

  const pivot = data.pivot;
  const pivotData = useMemo(() => {
    if (!pivot) return null;
    const leafVals = collectMonths(
      pivot.cells,
      (x) => `${x.customerType}\u0001${x.code}`,
    );
    const names = new Map<string, { group: string | null; label: string }>();
    for (const x of pivot.cells)
      names.set(`${x.customerType}\u0001${x.code}`, {
        group: x.customerType,
        label: x.name ?? x.code ?? BLANK,
      });
    return {
      leaves: [...leafVals.entries()].map(([id, values]) => ({
        id,
        label: names.get(id)?.label ?? id,
        group: names.get(id)?.group ?? null,
        values,
      })),
      groups: collectMonths(pivot.typeMonths, (x) => x.customerType ?? BLANK),
      total: collectMonths(pivot.monthTotals, () => "t").get("t") ?? new Map(),
    };
  }, [pivot]);

  const otherCols: AnalyticsColumn<TypeRow>[] = [
    { key: "key", label: "Nhóm khách" },
    {
      key: "aov",
      label: "AOV",
      align: "right",
      format: (v) => num(v as number | null),
    },
    {
      key: "aoc",
      label: "AOC",
      align: "right",
      format: (v) =>
        v === null || v === undefined
          ? "—"
          : (v as number).toLocaleString("vi-VN", { maximumFractionDigits: 2 }),
    },
    {
      key: "arpc",
      label: "ARPC",
      align: "right",
      format: (v) => num(v as number | null),
    },
    {
      key: "newCustomers",
      label: "Khách mới",
      align: "right",
      format: (v) => num(v as number),
    },
  ];
  const bizCols: AnalyticsColumn<TypeRow>[] = [
    { key: "key", label: "Nhóm khách" },
    {
      key: "quantity",
      label: "Sản Lượng",
      align: "right",
      format: (v) => num(v as number),
    },
    {
      key: "orders",
      label: "Hóa Đơn",
      align: "right",
      format: (v) => num(v as number),
    },
    {
      key: "revenue",
      label: "Doanh Số",
      align: "right",
      format: (v) => num(v as number),
    },
    {
      key: "cost",
      label: "Giá Vốn",
      align: "right",
      format: (v) => num(v as number),
    },
    {
      key: "margin",
      label: "% Biên LN",
      align: "right",
      format: (v) => pct2(v as number | null),
    },
  ];
  const typeRows = (data.byType ?? []).filter((r) =>
    TYPE_ORDER.includes(r.key),
  );
  const totalRow = data.byTypeTotal
    ? ({ ...data.byTypeTotal, key: "" } as TypeRow)
    : null;

  return (
    <div className="space-y-3">
      {c && (
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <KpiCard
            name="Khách mua hàng"
            value={vi(c.activeCustomers)}
            icon={ico(Users)}
            iconBg={TONES.arpc[0]}
            iconColor={TONES.arpc[1]}
            accent={TONES.arpc[2]}
          />
          <KpiCard
            name="Khách mới"
            value={vi(c.newCustomers)}
            icon={ico(UserPlus)}
            iconBg={TONES.revenue[0]}
            iconColor={TONES.revenue[1]}
            accent={TONES.revenue[2]}
          />
          <KpiCard
            name="Doanh Số Khách Mới"
            value={money(c.newCustomerRevenue)}
            icon={ico(Banknote)}
            iconBg={TONES.profit[0]}
            iconColor={TONES.profit[1]}
            accent={TONES.profit[2]}
          />
          <KpiCard
            name="Trung Bình 1 Đơn"
            value={c.aov === null ? "—" : money(c.aov)}
            icon={ico(ShoppingCart)}
            iconBg={TONES.aov[0]}
            iconColor={TONES.aov[1]}
            accent={TONES.aov[2]}
          />
          <KpiCard
            name="Trung Bình 1 Khách"
            value={c.arpc === null ? "—" : money(c.arpc)}
            icon={ico(UserRound)}
            iconBg={TONES.margin[0]}
            iconColor={TONES.margin[1]}
            accent={TONES.margin[2]}
          />
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Tỷ trọng loại khách theo tháng"
          subtitle="Số khách mua hàng">
          <QtStacked100
            groups={monthGroups}
            series={TYPE_ORDER}
            value={stacked(data.byMonthType)}
            fmt={vi}
          />
        </Panel>
        <Panel
          title="Tình hình khách mua theo tháng"
          subtitle="Khách mới / quay lại / mua lại">
          <QtStacked100
            groups={monthGroups}
            series={statuses}
            value={stacked(data.byMonthStatus)}
            fmt={vi}
            colors={STATUS_COLORS}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Các chỉ số khác">
          <AnalyticsTable
            columns={otherCols}
            rows={typeRows}
            totals={totalRow}
            maxHeight={260}
          />
        </Panel>
        <Panel title="Tình hình kinh doanh theo nhóm khách">
          <AnalyticsTable
            columns={bizCols}
            rows={typeRows}
            totals={totalRow}
            maxHeight={260}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title={`${m} Theo Nhóm Khách Và Vùng`}>
          <QtStacked100
            groups={TYPE_ORDER}
            series={typeRegion.regions}
            value={typeRegion.value}
            fmt={fmt}
          />
        </Panel>
        <Panel title={`${m} Theo Vùng`}>
          <QtDonut
            rows={(data.byRegion ?? [])
              .map((r) => ({ name: r.key ?? BLANK, value: r.value ?? 0 }))
              .sort((a, b) => b.value - a.value)}
            fmt={fmt}
          />
        </Panel>
        <Panel
          title="Doanh Số Theo Tỉnh / Thành"
          subtitle="Thay bản đồ của Power BI">
          <QtHBar
            rows={(data.byProvince ?? []).map((r) => ({
              name: r.key ?? BLANK,
              value: r.value,
            }))}
            fmt={(v) => qtLabel(v, "amount")}
            maxHeight={300}
            valueName="Doanh số"
          />
        </Panel>
      </div>

      {pivotData && pivot && (
        <Panel
          title="Tổng hợp doanh số theo khách hàng"
          subtitle={`${m} theo tháng · MoM = so với tháng liền trước`}>
          <QtMonthPivot
            months={pivot.months}
            leaves={pivotData.leaves}
            groups={pivotData.groups}
            total={pivotData.total}
            metric={metric}
            firstLabel="Nhóm khách / Khách hàng"
          />
        </Panel>
      )}
    </div>
  );
}
