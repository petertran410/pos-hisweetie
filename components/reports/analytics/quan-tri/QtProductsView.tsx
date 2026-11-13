"use client";

import { useMemo } from "react";
import { Banknote, Package, Percent, TrendingUp } from "lucide-react";
import type { AnalyticsAxis } from "@/lib/api/analytics-reports";
import type { QtMetric, QtProducts } from "@/lib/api/analytics-quan-tri";
import { money, vi } from "@/lib/dashboard/format";
import { Panel } from "../shared/AnalyticsCharts";
import { QtHBar, QtLine } from "./QtCharts";
import { QtMonthPivot, collectMonths, leavesFromRows } from "./QtMonthPivot";
import { AxisSeg, QtKpi, TONES } from "./QtOverview";
import { BLANK, pct2, qtAxis, qtLabel, qtMetricTitle } from "./qtFormat";

const ico = (C: typeof Banknote) => <C className="w-[18px] h-[18px]" />;

export function QtProductsView({
  data,
  metric,
  axis,
  onAxisChange,
}: {
  data: QtProducts;
  metric: QtMetric;
  axis: AnalyticsAxis;
  onAxisChange: (a: AnalyticsAxis) => void;
}) {
  const c = data.cards;
  const fmt = (v: number) => qtLabel(v, metric);
  const m = qtMetricTitle(metric);
  const target =
    c?.target.rate === null || c?.target.rate === undefined
      ? undefined
      : `Đã đạt được ${pct2(c.target.rate)} mục tiêu năm`;

  const pivot = data.pivot;
  const pivotData = useMemo(() => {
    if (!pivot) return null;
    const allByMonth = new Map<string, number | null>();
    for (const t of pivot.monthTotals) if (t.k) allByMonth.set(t.k, t.all);
    return {
      leaves: leavesFromRows(pivot),
      groups: collectMonths(pivot.categoryMonths, (x) => x.category ?? BLANK),
      total: collectMonths(pivot.monthTotals, () => "t").get("t") ?? new Map(),
      share: (ym: string, v: number | null) => {
        const all = allByMonth.get(`cur:${ym}`);
        return v === null || !all ? null : v / all;
      },
    };
  }, [pivot]);

  const top10 = [...(data.products ?? [])]
    .map((p) => ({ name: p.name ?? p.code ?? BLANK, value: p[metric] ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const axisName =
    axis === "day" ? "ngày" : axis === "weekday" ? "thứ" : "tháng";

  return (
    <div className="space-y-3">
      {c && (
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(210px,1fr))]">
          <QtKpi
            name="Lợi Nhuận Gộp"
            card={c.grossProfit}
            fmt={money}
            compareLabel={data.compareLabel}
            icon={ico(TrendingUp)}
            tone={TONES.profit}
          />
          <QtKpi
            name={m}
            card={c.revenue}
            value={c.metricValue}
            fmt={metric === "amount" || metric === "profit" ? money : fmt}
            compareLabel={data.compareLabel}
            icon={ico(Banknote)}
            tone={TONES.revenue}
            note={target}
          />
          <QtKpi
            name="Sản Lượng Bán"
            card={c.quantity}
            fmt={vi}
            compareLabel={data.compareLabel}
            icon={ico(Package)}
            tone={TONES.quantity}
            note={target}
          />
          <QtKpi
            name="Biên Lợi Nhuận"
            card={c.margin}
            value={c.netMargin}
            fmt={(n) => pct2(n)}
            compareLabel={data.compareLabel}
            icon={ico(Percent)}
            tone={TONES.margin}
            note={target}
          />
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Xu Hướng Của Sản Phẩm"
          subtitle={`${m} theo ${axisName}`}
          right={<AxisSeg axis={axis} onChange={onAxisChange} />}>
          <QtLine
            rows={(data.trend ?? []).map((t) => ({
              name: t.label,
              cur: t[metric],
            }))}
            fmt={fmt}
            axisFmt={(v) => qtAxis(v, metric)}
            curName={m}
          />
        </Panel>
        <Panel
          title="Top 10 Bán Chạy Qua Các Tháng"
          subtitle="Hàng thương hiệu + thương mại">
          <QtHBar rows={top10} fmt={fmt} valueName={m} maxHeight={320} />
        </Panel>
      </div>

      {pivotData && pivot && (
        <Panel
          title="Tăng Trưởng và Tỷ Trọng của Nhóm Hàng Đang Kinh Doanh"
          subtitle={`${m} theo tháng · MoM = so với tháng liền trước · Tỷ trọng trên toàn bộ mặt hàng`}>
          <QtMonthPivot
            months={pivot.months}
            leaves={pivotData.leaves}
            groups={pivotData.groups}
            total={pivotData.total}
            metric={metric}
            firstLabel="Danh mục / Mặt hàng"
            share={pivotData.share}
          />
        </Panel>
      )}
    </div>
  );
}
