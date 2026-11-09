"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { deltaPct, DT_COLORS, pct, vi } from "@/lib/dashboard/format";
import type { LeadSourceRow } from "@/lib/dashboard/lead/leadDashboard.types";
import { LEAD_SOURCE_LABEL } from "@/lib/leads/constants";
import { LeadCard, RateCell, SOURCE_COLOR, TOOLTIP_STYLE } from "./leadUi";
import { SortableTable, type SortColumn } from "./SortableTable";

type Ranked = LeadSourceRow & { rank: number };

export function LeadSourceSection({ rows }: { rows: LeadSourceRow[] }) {
  // Xếp hạng theo số lead chuyển đổi (hoà → nhiều lead hơn xếp trước).
  const ranked: Ranked[] = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.converted - a.converted || b.leads - a.leads)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );
  const maxRate = Math.max(...rows.map((r) => r.conversionRate), 0);
  const best = [...rows]
    .filter((r) => r.leads > 0)
    .sort((a, b) => b.conversionRate - a.conversionRate)[0];

  const chartData = rows.map((r) => ({
    name: LEAD_SOURCE_LABEL[r.source],
    converted: r.converted,
    notConverted: r.leads - r.converted,
    leads: r.leads,
  }));

  const columns: SortColumn<Ranked>[] = [
    {
      key: "rank",
      header: "Hạng",
      sortValue: (r) => r.rank,
      render: (r) => (
        <span className="dt-mono font-semibold" style={{ color: "var(--dt-text-muted)" }}>
          {r.rank}
        </span>
      ),
    },
    {
      key: "source",
      header: "Nguồn",
      sortValue: (r) => LEAD_SOURCE_LABEL[r.source],
      render: (r) => (
        <span className="inline-flex items-center gap-2 font-medium">
          <i
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ background: SOURCE_COLOR[r.source] }}
          />
          {LEAD_SOURCE_LABEL[r.source]}
        </span>
      ),
    },
    {
      key: "leads",
      header: "Lead",
      align: "right",
      sortValue: (r) => r.leads,
      render: (r) => <span className="dt-mono font-semibold">{vi(r.leads)}</span>,
    },
    {
      key: "change",
      header: "Δ kỳ trước",
      align: "right",
      hint: "Thay đổi số lead so với kỳ trước",
      sortValue: (r) => r.leadsChangePct ?? -999,
      render: (r) =>
        r.leadsChangePct === null ? (
          "—"
        ) : (
          <span
            className="dt-mono text-[12px] font-semibold"
            style={{ color: r.leadsChangePct >= 0 ? "#2E8B8F" : "#C0392B" }}>
            {deltaPct(r.leadsChangePct)}
          </span>
        ),
    },
    {
      key: "converted",
      header: "Chuyển đổi",
      align: "right",
      sortValue: (r) => r.converted,
      render: (r) => <span className="dt-mono font-semibold">{vi(r.converted)}</span>,
    },
    {
      key: "rate",
      header: "Tỷ lệ CĐ",
      align: "right",
      sortValue: (r) => r.conversionRate,
      render: (r) => <RateCell value={r.conversionRate} max={maxRate} />,
    },
  ];

  return (
    <LeadCard
      title="Lead theo nguồn"
      subtitle="Số lead và số đã chuyển đổi · xếp hạng theo số lead chuyển đổi">
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5 h-[300px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 18, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#EAF3F4" vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#5A8A92", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: "#5A8A92", fontSize: 11 }}
                width={40}
              />
              <Tooltip {...TOOLTIP_STYLE} cursor={{ fill: "rgba(0,183,204,0.06)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="converted"
                name="Đã chuyển đổi"
                stackId="s"
                fill={DT_COLORS.primaryDark}
                maxBarSize={34}
              />
              <Bar
                dataKey="notConverted"
                name="Chưa chuyển đổi"
                stackId="s"
                fill={DT_COLORS.cyanSoft}
                radius={[4, 4, 0, 0]}
                maxBarSize={34}>
                <LabelList
                  dataKey="leads"
                  position="top"
                  style={{ fill: "#0D3B42", fontSize: 11, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="xl:col-span-7 min-w-0">
          <SortableTable
            caption="Bảng xếp hạng nguồn lead"
            columns={columns}
            rows={ranked}
            rowKey={(r) => r.source}
            defaultSort={{ key: "rank", dir: "asc" }}
          />
          {best && (
            <p className="text-[11.5px] mt-2" style={{ color: "var(--dt-text-muted)" }}>
              Nguồn có tỷ lệ chuyển đổi cao nhất:{" "}
              <b style={{ color: "var(--dt-text)" }}>
                {LEAD_SOURCE_LABEL[best.source] ?? best.source} ({pct(best.conversionRate)})
              </b>
            </p>
          )}
        </div>
      </div>
    </LeadCard>
  );
}
