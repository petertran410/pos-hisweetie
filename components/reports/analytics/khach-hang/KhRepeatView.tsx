"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  KhHeatmap,
  KhRepeat,
  KhRepeatAction,
} from "@/lib/api/analytics-khach-hang";
import { vi } from "@/lib/dashboard/format";
import { BLANK_LABEL, TOOLTIP_STYLE } from "../analyticsFormat";
import { BarText, Empty, Panel, axisTick } from "../shared/AnalyticsCharts";
import { fmtDate } from "./KhCharts";

// Màu của các thẻ HTML Content "RC …" trong Power BI.
const NAVY = "#133E87";
const BLUE = "#608BC1";
const PALE = "#CBDCEB";
const CREAM = "#F3F3E0";

const pct1 = (v: number) =>
  `${(v * 100).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const pctInt = (v: number) => `${Math.round(v * 100)}%`;
/** "x,x tỷ" / "x,x triệu" như RC HTML Card - Care Customers. */
const tyTrieu = (v: number) =>
  Math.abs(v) >= 1e9
    ? `${(v / 1e9).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} tỷ`
    : `${(v / 1e6).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} triệu`;

/** RC Retention Rate Color. */
const rateColor = (r: number | null) =>
  r === null ? PALE : r >= 0.7 ? NAVY : r >= 0.55 ? BLUE : PALE;
/** RC Retention Heatmap Cell Color. */
const heatColor = (r: number | null) =>
  r === null
    ? "#E9EEF0"
    : r > 0.7
      ? "#DCEFE8"
      : r >= 0.5
        ? "#FFF1DA"
        : "#FCE4E1";

function RcCard({
  title,
  value,
  children,
  dark = false,
}: {
  title: string;
  value: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className="rounded-[20px] px-6 py-5"
      style={{
        background: dark ? NAVY : CREAM,
        border: dark ? undefined : `1px solid ${PALE}`,
        color: dark ? CREAM : NAVY,
      }}>
      <div
        className="text-[15px] font-bold"
        style={{ color: dark ? PALE : BLUE }}>
        {title}
      </div>
      <div className="text-[38px] leading-[1.1] font-extrabold tracking-tight mt-2.5 dt-mono">
        {value}
      </div>
      <div
        className="text-[13.5px] leading-snug font-semibold mt-3"
        style={{ color: dark ? PALE : BLUE }}>
        {children}
      </div>
    </div>
  );
}

/** Trang Repeat Customer: 5 thẻ RC, retention theo phân khúc, danh sách khách cần chăm sóc. */
export function KhRepeatView({ data }: { data: KhRepeat }) {
  const c = data.cards;
  if (!c || !data.month) return null;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {c.retention !== null && (
          <RcCard title="Monthly Retention Rate" value={pct1(c.retention)} dark>
            {vi(c.repeat)} / {vi(c.previousCustomers)} khách tháng trước tiếp
            tục mua
          </RcCard>
        )}
        <RcCard title="Repeat Customers" value={vi(c.repeat)}>
          Khách mua liên tiếp 2 tháng
          {c.repeatMoM !== null && (
            <span
              className="font-extrabold"
              style={{ color: c.repeatMoM >= 0 ? NAVY : BLUE }}>
              {" "}
              {c.repeatMoM >= 0 ? "+" : ""}
              {pct1(c.repeatMoM)} MoM
            </span>
          )}
        </RcCard>
        {c.repeatShare !== null && (
          <RcCard title="Repeat Customer Share" value={pct1(c.repeatShare)}>
            Repeat / Active customer tháng chọn
          </RcCard>
        )}
        <RcCard title="Reacquired Customers" value={vi(c.reacquired)}>
          Khách quay lại sau ít nhất 1 tháng không mua
        </RcCard>
        <RcCard title="Khách cần chăm sóc" value={vi(c.care)}>
          Mua tháng trước, chưa mua tháng này
          <br />
          <span className="font-extrabold" style={{ color: NAVY }}>
            {tyTrieu(c.careRevenue)} doanh số tháng trước
          </span>
        </RcCard>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Retention rate theo nhóm khách">
          <RateColumns rows={data.byCustomerType ?? []} />
        </Panel>
        <Panel title="Retention rate: nhóm sale × nhóm khách">
          <Heatmap data={data.byTeam} rowLabel="Nhóm Sale" />
        </Panel>
        <Panel title="Retention rate: vùng × nhóm khách">
          <Heatmap data={data.byRegion} rowLabel="Vùng" />
        </Panel>
      </div>

      <Panel
        title="Khách có phát sinh mua hàng tháng trước và tháng này chưa mua lại, theo từng SKU"
        subtitle={`Tháng trước: ${fmtDate(data.month.prevFrom)} – ${fmtDate(data.month.prevTo)} · DS 3 tháng gần nhất: 3 tháng trước tháng chọn`}>
        <ActionTable rows={data.actions ?? []} />
      </Panel>
    </div>
  );
}

function RateColumns({
  rows,
}: {
  rows: { key: string | null; rate: number | null }[];
}) {
  const data = rows.map((r) => ({
    name: r.key ?? BLANK_LABEL,
    value: r.rate ?? 0,
    color: rateColor(r.rate),
  }));
  if (!data.length) return <Empty />;
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E3EEF0"
          />
          <XAxis
            dataKey="name"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => pctInt(Number(v))}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "rgba(19,62,135,0.06)" }}
            formatter={(v) => [pct1(Number(v)), "Retention rate"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
            <LabelList
              dataKey="value"
              content={(p) => (
                <BarText {...p} text={pct1(Number(p.value))} side="top" />
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Heatmap({ data, rowLabel }: { data?: KhHeatmap; rowLabel: string }) {
  if (!data || !data.rows.length) return <Empty />;
  const cell = (r: number | null, bold = false) => (
    <td
      className={`px-2.5 py-2 text-center dt-mono ${bold ? "font-bold" : "font-semibold"}`}
      style={{ background: heatColor(r), color: NAVY }}>
      {r === null ? "—" : pct1(r)}
    </td>
  );
  return (
    <div
      className="border rounded-lg overflow-auto"
      style={{ borderColor: "var(--dt-border)" }}>
      <table className="w-full text-[12.5px] border-collapse">
        <thead
          style={{ background: "#F3F8F9", color: "var(--dt-text-secondary)" }}>
          <tr>
            <th className="px-2.5 py-2 text-left font-semibold">{rowLabel}</th>
            {data.columns.map((col) => (
              <th
                key={col ?? ""}
                className="px-2.5 py-2 text-center font-semibold whitespace-nowrap">
                {col ?? BLANK_LABEL}
              </th>
            ))}
            <th className="px-2.5 py-2 text-center font-semibold">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.key ?? ""} className="border-t border-white">
              <td className="px-2.5 py-2 font-semibold whitespace-nowrap">
                {r.key ?? BLANK_LABEL}
              </td>
              {data.columns.map((col) => (
                <Fragment key={col ?? ""}>
                  {cell(r.cells[col ?? ""] ?? null)}
                </Fragment>
              ))}
              {cell(r.total, true)}
            </tr>
          ))}
          <tr className="border-t border-white">
            <td className="px-2.5 py-2 font-bold">Tổng</td>
            {data.columns.map((col) => (
              <Fragment key={col ?? ""}>
                {cell(data.totals[col ?? ""] ?? null, true)}
              </Fragment>
            ))}
            {cell(data.grand, true)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ActionTable({ rows }: { rows: KhRepeatAction[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = useMemo(() => {
    const m = new Map<string, KhRepeatAction[]>();
    for (const r of rows) {
      if (!m.has(r.parentName)) m.set(r.parentName, []);
      m.get(r.parentName)!.push(r);
    }
    return [...m.entries()].map(([name, items]) => ({
      name,
      items,
      qty: items.reduce((s, x) => s + x.qtyPrev, 0),
      rev: items.reduce((s, x) => s + x.revPrev, 0),
      rev3m: items.reduce((s, x) => s + x.rev3m, 0),
      last: items.reduce<string | null>(
        (m2, x) => (x.lastDate && (!m2 || x.lastDate > m2) ? x.lastDate : m2),
        null,
      ),
      reps: [...new Set(items.map((x) => x.saleRep))].join(", "),
    }));
  }, [rows]);
  if (!groups.length) return <Empty />;
  const allOpen = open.size === groups.length;
  const toggle = (name: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  const num = "px-2.5 py-1.5 text-right dt-mono whitespace-nowrap";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12.5px]">
        <span style={{ color: "var(--dt-text-muted)" }}>
          {vi(groups.length)} khách cha · {vi(rows.length)} dòng SKU
        </span>
        <button
          type="button"
          className="font-medium px-2.5 py-1 rounded-md hover:bg-gray-50"
          style={{ color: "var(--dt-text-secondary)" }}
          onClick={() =>
            setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.name)))
          }>
          {allOpen ? "Thu gọn tất cả" : "Mở tất cả SKU"}
        </button>
      </div>
      <div
        className="border rounded-lg overflow-auto"
        style={{ maxHeight: 620, borderColor: "var(--dt-border)" }}>
        <table className="w-full text-[12.5px] border-collapse">
          <thead
            className="sticky top-0 z-10"
            style={{
              background: "#F3F8F9",
              color: "var(--dt-text-secondary)",
            }}>
            <tr>
              {[
                "Tên Khách Cha / Tên Sản Phẩm",
                "Sale Phụ Trách",
                "SL Tháng Trước",
                "DS Tháng Trước",
                "DS 3 Tháng Gần Nhất",
                "Ngày Cuối Mua Hàng",
              ].map((h, i) => (
                <th
                  key={h}
                  className={`px-2.5 py-2 font-semibold text-[12px] whitespace-nowrap border-b ${i < 2 ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.name}>
                <tr
                  className="border-b hover:bg-[#F7FBFC]"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <td className="px-2.5 py-1.5 font-semibold">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-left"
                      onClick={() => toggle(g.name)}>
                      {open.has(g.name) ? (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {g.name}
                    </button>
                  </td>
                  <td className="px-2.5 py-1.5">{g.reps}</td>
                  <td className={`${num} font-semibold`}>{vi(g.qty)}</td>
                  <td className={`${num} font-semibold`}>{vi(g.rev)}</td>
                  <td className={`${num} font-semibold`}>{vi(g.rev3m)}</td>
                  <td className={`${num} font-semibold`}>
                    {g.last ? fmtDate(g.last) : ""}
                  </td>
                </tr>
                {open.has(g.name) &&
                  g.items.map((x) => (
                    <tr
                      key={`${x.saleRep}|${x.productCode}`}
                      className="border-b hover:bg-[#F7FBFC]"
                      style={{ borderColor: "var(--dt-border)" }}>
                      <td className="pl-8 pr-2.5 py-1.5">{x.productName}</td>
                      <td className="px-2.5 py-1.5">{x.saleRep}</td>
                      <td className={num}>{vi(x.qtyPrev)}</td>
                      <td className={num}>{vi(x.revPrev)}</td>
                      <td className={num}>{vi(x.rev3m)}</td>
                      <td className={num}>
                        {x.lastDate ? fmtDate(x.lastDate) : ""}
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
