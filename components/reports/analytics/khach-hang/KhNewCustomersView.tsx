"use client";

import { Sparkles, UserPlus } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { KhNewCustomers } from "@/lib/api/analytics-khach-hang";
import { DT_COLORS, vi } from "@/lib/dashboard/format";
import { BLANK_LABEL, growthDelta, metricLabel } from "../analyticsFormat";
import { AnalyticsTable } from "../shared/AnalyticsTable";
import { ColumnChart, Panel } from "../shared/AnalyticsCharts";
import { fmtDate } from "./KhCharts";

type Row = KhNewCustomers["list"][number];

/**
 * Trang New Customer. Trang Power BI cùng tên chưa có biểu đồ (chỉ slicer), nên
 * dựng từ các measure khách mới của report: New Customer, revenue_new_customer.
 */
export function KhNewCustomersView({ data }: { data: KhNewCustomers }) {
  const c = data.cards;
  if (!c) return null;
  const vs = data.compareLabel ? `vs ${data.compareLabel}` : undefined;
  const g1 = growthDelta(c.newCustomers.growth);
  const g2 = growthDelta(c.revenueNew.growth);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        <KpiCard
          name="Khách mới"
          value={vi(c.newCustomers.current ?? 0)}
          delta={g1.delta}
          deltaDir={g1.dir}
          vs={vs}
          icon={<UserPlus className="w-[18px] h-[18px]" />}
          iconBg="#E0F6F9"
          iconColor="#00A5B5"
          accent="#00A5B5"
        />
        <KpiCard
          name="DS Khách Mới"
          value={metricLabel(c.revenueNew.current ?? 0, "amount")}
          delta={g2.delta}
          deltaDir={g2.dir}
          vs={vs}
          icon={<Sparkles className="w-[18px] h-[18px]" />}
          iconBg="#E6F2F2"
          iconColor="#2E8B8F"
          accent="#2E8B8F"
        />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Khách mới theo tháng" subtitle="Số khách cha mua lần đầu">
          <ColumnChart
            rows={data.byMonth.map((r) => ({
              name: `Tháng ${r.m}`,
              value: r.newCustomers,
            }))}
            metric="customers"
            color={DT_COLORS.primary}
          />
        </Panel>
        <Panel title="DS khách mới theo tháng">
          <ColumnChart
            rows={data.byMonth.map((r) => ({
              name: `Tháng ${r.m}`,
              value: r.revenueNew,
            }))}
            metric="amount"
            color={DT_COLORS.gold}
          />
        </Panel>
      </div>
      <Panel
        title="Danh sách khách mới"
        subtitle="Khách cha có hoá đơn đầu tiên trong tháng phát sinh (Is New Customer This Month)">
        <AnalyticsTable<Row>
          rows={data.list}
          rowKey={(r, i) => `${r.parentName ?? ""}-${i}`}
          columns={[
            {
              key: "parentName",
              label: "Tên Khách Cha",
              format: (v) => (v as string | null) ?? BLANK_LABEL,
            },
            {
              key: "firstDate",
              label: "Ngày mua đầu tiên",
              format: (v) => (v ? fmtDate(String(v)) : ""),
            },
            { key: "customerType", label: "Nhóm khách" },
            { key: "region", label: "Vùng" },
            {
              key: "orders",
              label: "Số hoá đơn",
              align: "right",
              format: (v) => vi(Number(v)),
            },
            {
              key: "amount",
              label: "Doanh số",
              align: "right",
              format: (v) => vi(Number(v)),
            },
          ]}
          totals={{
            parentName: null,
            firstDate: null,
            customerType: null,
            region: null,
            orders: data.list.reduce((s, r) => s + r.orders, 0),
            amount: data.list.reduce((s, r) => s + r.amount, 0),
          }}
        />
      </Panel>
    </div>
  );
}
