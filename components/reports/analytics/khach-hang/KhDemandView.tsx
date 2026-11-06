"use client";

import { Fragment } from "react";
import type { KhDemand, KhDemandCell } from "@/lib/api/analytics-khach-hang";
import { Empty, Panel } from "../shared/AnalyticsCharts";

const fmt = (v: number) =>
  v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** add_sub_demand: âm (bán thiếu so với demand) đỏ, dương xanh. */
const diffColor = (v: number) =>
  v < 0 ? "#D64550" : v > 0 ? "#1A8403" : undefined;

/** Trang Demand: "Theo Dõi Demand Maycha" — Demand / Thực Tế / +/- Hàng theo tháng. */
export function KhDemandView({ data }: { data: KhDemand }) {
  const td = "px-2.5 py-1.5 text-right dt-mono whitespace-nowrap";
  const cells = (c: KhDemandCell | null | undefined, bold = false) => (
    <>
      <td className={`${td} border-l ${bold ? "font-semibold" : ""}`}>
        {c ? fmt(c.demand) : ""}
      </td>
      <td className={`${td} ${bold ? "font-semibold" : ""}`}>
        {c ? fmt(c.actual) : ""}
      </td>
      <td
        className={`${td} ${bold ? "font-semibold" : ""}`}
        style={{ color: c ? diffColor(c.diff) : undefined }}>
        {c ? fmt(c.diff) : ""}
      </td>
    </>
  );
  const groups = [
    ...data.months.map((m) => ({
      key: String(m),
      label: `Tháng ${String(m).padStart(2, "0")}`,
    })),
    { key: "total", label: "Tổng" },
  ];
  return (
    <Panel title="Theo Dõi Demand Maycha" subtitle={data.subtitle}>
      {!data.rows.length ? (
        <Empty />
      ) : (
        <div
          className="border rounded-lg overflow-auto"
          style={{ maxHeight: 640, borderColor: "var(--dt-border)" }}>
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
                  className="px-2.5 py-2 text-left font-semibold text-[12px] border-b sticky left-0 z-20 min-w-[240px]"
                  style={{ background: "#F3F8F9" }}>
                  Tên Hàng
                </th>
                {groups.map((g) => (
                  <th
                    key={g.key}
                    colSpan={3}
                    className="px-2.5 pt-2 pb-1 text-center font-semibold text-[12px] border-l whitespace-nowrap">
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr>
                {groups.map((g) => (
                  <Fragment key={g.key}>
                    {["Demand", "Thực Tế", "+/- Hàng"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-2.5 py-1.5 text-right font-semibold text-[12px] border-b whitespace-nowrap ${i ? "" : "border-l"}`}>
                        {h}
                      </th>
                    ))}
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr
                  key={r.code}
                  className="border-b hover:bg-[#F7FBFC]"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <td className="px-2.5 py-1.5 sticky left-0 bg-white">
                    {r.name.trim()}
                  </td>
                  {data.months.map((m) => (
                    <Fragment key={m}>{cells(r.cells[String(m)])}</Fragment>
                  ))}
                  {cells(r.total, true)}
                </tr>
              ))}
            </tbody>
            <tfoot
              className="sticky bottom-0"
              style={{ background: "#F3F8F9" }}>
              <tr>
                <td
                  className="px-2.5 py-2 font-bold sticky left-0"
                  style={{ background: "#F3F8F9" }}>
                  Tổng
                </td>
                {data.months.map((m) => (
                  <Fragment key={m}>
                    {cells(data.total.cells[String(m)], true)}
                  </Fragment>
                ))}
                {cells(data.total.total, true)}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Panel>
  );
}
