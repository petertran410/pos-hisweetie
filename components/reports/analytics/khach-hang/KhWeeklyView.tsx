"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type { KhWeekCells, KhWeekly } from "@/lib/api/analytics-khach-hang";
import { vi } from "@/lib/dashboard/format";
import { metricTitle } from "../analyticsFormat";
import { Panel } from "../shared/AnalyticsCharts";
import { PercentBarList } from "./KhCharts";

const pct = (v: number) =>
  `${(v * 100).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/** Màu chữ % WoW như Power BI: < 0 đỏ, 0 – 1000 xanh. */
const wowColor = (w: number | null) =>
  w === null ? undefined : w < 0 ? "#D64550" : w < 1000 ? "#1A8403" : undefined;

/** Trang VIP / Key Persale: 10 KH tăng / giảm mua (WoW) + bảng tổng hợp theo tuần. */
export function KhWeeklyView({
  data,
  kind,
  metric,
}: {
  data: KhWeekly;
  kind: "vip" | "key";
  metric: AnalyticsMetric;
}) {
  const who = kind === "vip" ? "KH VIP Cty" : "KH key";
  const sub = data.currentWeek
    ? `${data.currentWeek.label} so với tuần trước (Doanh số dòng hàng)`
    : undefined;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title={`10 ${who} tăng mua`} subtitle={sub}>
          <PercentBarList
            rows={data.increase}
            color="#2E8B8F"
            emptyText="Không có khách tăng mua"
          />
        </Panel>
        <Panel title={`10 ${who} giảm mua`} subtitle={sub}>
          <PercentBarList
            rows={data.decrease}
            color="#D64550"
            emptyText="Không có khách giảm mua"
          />
        </Panel>
      </div>
      <Panel
        title="Tổng hợp doanh số theo khách hàng"
        subtitle={`Giá trị: ${metricTitle(metric)} trong kỳ · Doanh Số WoW %: cả tuần so với tuần trước`}>
        <WeekPivot data={data} />
      </Panel>
    </div>
  );
}

function WeekPivot({ data }: { data: KhWeekly }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const parents = useMemo(() => data.pivot?.parents ?? [], [data.pivot]);
  if (!data.pivot || !parents.length)
    return (
      <div
        className="p-6 text-center text-[13px]"
        style={{ color: "var(--dt-text-muted)" }}>
        Không có dữ liệu
      </div>
    );
  const allOpen = open.size === parents.length;
  const toggle = (name: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  const cellsOf = (cells: KhWeekCells, bold = false) =>
    data.weeks.map((w) => {
      const c = cells[String(w.wk)] ?? { v: null, w: null };
      return (
        <Fragment key={w.wk}>
          <td
            className={`px-2.5 py-1.5 text-right dt-mono whitespace-nowrap ${bold ? "font-semibold" : ""}`}
            style={{ background: c.v === null ? "#efb5b9" : undefined }}>
            {c.v === null ? "" : vi(c.v)}
          </td>
          <td
            className={`px-2.5 py-1.5 text-right dt-mono whitespace-nowrap ${bold ? "font-semibold" : ""}`}
            style={{ color: wowColor(c.w) }}>
            {c.w === null ? "" : pct(c.w)}
          </td>
        </Fragment>
      );
    });

  const th =
    "px-2.5 py-2 font-semibold text-[12px] whitespace-nowrap border-b text-right";
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-[12.5px] font-medium px-2.5 py-1 rounded-md hover:bg-gray-50"
          style={{ color: "var(--dt-text-secondary)" }}
          onClick={() =>
            setOpen(allOpen ? new Set() : new Set(parents.map((p) => p.name)))
          }>
          {allOpen ? "Thu gọn tất cả" : "Mở tất cả sản phẩm"}
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
              <th
                rowSpan={2}
                className="px-2.5 py-2 text-left font-semibold text-[12px] border-b sticky left-0 z-20 min-w-[260px]"
                style={{ background: "#F3F8F9" }}>
                Tên Khách Cha / Sản Phẩm
              </th>
              {data.weeks.map((w) => (
                <th
                  key={w.wk}
                  colSpan={2}
                  className="px-2.5 pt-2 pb-1 text-center font-semibold text-[12px] whitespace-nowrap border-l"
                  style={{ borderColor: "var(--dt-border)" }}>
                  {w.label}
                </th>
              ))}
            </tr>
            <tr>
              {data.weeks.map((w) => (
                <Fragment key={w.wk}>
                  <th className={`${th} border-l`}>Giá trị</th>
                  <th className={th}>Doanh Số WoW %</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => {
              const isOpen = open.has(p.name);
              return (
                <Fragment key={p.name}>
                  <tr
                    className="border-b hover:bg-[#F7FBFC]"
                    style={{ borderColor: "var(--dt-border)" }}>
                    <td className="px-2.5 py-1.5 sticky left-0 bg-white font-semibold">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-left"
                        onClick={() => toggle(p.name)}>
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        )}
                        {p.name || "(Trống)"}
                      </button>
                    </td>
                    {cellsOf(p.cells, true)}
                  </tr>
                  {isOpen &&
                    p.products.map((x) => (
                      <tr
                        key={x.code}
                        className="border-b hover:bg-[#F7FBFC]"
                        style={{ borderColor: "var(--dt-border)" }}>
                        <td className="pl-8 pr-2.5 py-1.5 sticky left-0 bg-white">
                          {x.name}
                        </td>
                        {cellsOf(x.cells)}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="sticky bottom-0" style={{ background: "#F3F8F9" }}>
            <tr>
              <td
                className="px-2.5 py-2 font-bold sticky left-0"
                style={{ background: "#F3F8F9" }}>
                Tổng
              </td>
              {cellsOf(data.pivot.total, true)}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
