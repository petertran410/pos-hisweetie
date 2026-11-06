"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type { KhChurn } from "@/lib/api/analytics-khach-hang";
import { vi } from "@/lib/dashboard/format";
import { BLANK_LABEL, metricTitle } from "../analyticsFormat";
import { DonutChart, Empty, Panel } from "../shared/AnalyticsCharts";
import { fmtDate } from "./KhCharts";

/** Trang Churn Customer: khách "1.Khách Churn" theo sale phụ trách + danh sách. */
export function KhChurnView({
  data,
  metric,
}: {
  data: KhChurn;
  metric: AnalyticsMetric;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (name: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  const pie = data.bySalePic.map((r) => ({
    name: r.key ?? BLANK_LABEL,
    value: r.value,
  }));
  const total = data.rows.reduce(
    (s, r) => ({
      v: s.v + r.value[metric],
      d: s.d + r.churnDay,
    }),
    { v: 0, d: 0 },
  );
  const num = "px-2.5 py-1.5 text-right dt-mono whitespace-nowrap";

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_2fr]">
      <Panel
        title="Theo người bán"
        subtitle={`Khách lâu chưa mua (khách cha) · ${vi(data.totalCustomers)} khách`}>
        <DonutChart rows={pie} metric="customers" />
      </Panel>
      <Panel
        title="Danh Sách Khách Đã Lâu Chưa Mua Hàng"
        subtitle={`Nhóm "1.Khách Churn": buôn 10–45 ngày, chuỗi 15–45 ngày, lẻ 30–60 ngày chưa mua (tính tới ${fmtDate(data.today)}) · Giá trị: ${metricTitle(metric)} trong kỳ`}>
        {!data.rows.length ? (
          <Empty />
        ) : (
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
                    "Tên Khách Hàng / Tên Sản Phẩm",
                    "Giá Trị",
                    "Lần Cuối Đặt Hàng",
                    "Số Ngày Chưa Mua Hàng",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-2.5 py-2 font-semibold text-[12px] whitespace-nowrap border-b ${i ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <Fragment key={r.name}>
                    <tr
                      className="border-b hover:bg-[#F7FBFC]"
                      style={{ borderColor: "var(--dt-border)" }}>
                      <td className="px-2.5 py-1.5 font-semibold">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left"
                          disabled={!r.products.length}
                          onClick={() => toggle(r.name)}>
                          {r.products.length ? (
                            open.has(r.name) ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            )
                          ) : (
                            <span className="w-3.5" />
                          )}
                          {r.name.trim() || BLANK_LABEL}
                        </button>
                      </td>
                      <td className={`${num} font-semibold`}>
                        {r.value[metric] ? vi(r.value[metric]) : ""}
                      </td>
                      <td className={num}>{fmtDate(r.lastOrder)}</td>
                      <td className={num}>{vi(r.churnDay)}</td>
                    </tr>
                    {open.has(r.name) &&
                      r.products.map((p) => (
                        <tr
                          key={p.code}
                          className="border-b hover:bg-[#F7FBFC]"
                          style={{ borderColor: "var(--dt-border)" }}>
                          <td className="pl-8 pr-2.5 py-1.5">{p.name}</td>
                          <td className={num}>
                            {p.value[metric] ? vi(p.value[metric]) : ""}
                          </td>
                          <td className={num}>{fmtDate(r.lastOrder)}</td>
                          <td className={num}>{vi(r.churnDay)}</td>
                        </tr>
                      ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot
                className="sticky bottom-0"
                style={{ background: "#F3F8F9" }}>
                <tr>
                  <td className="px-2.5 py-2 font-bold">Tổng</td>
                  <td className={`${num} font-bold`}>{vi(total.v)}</td>
                  <td />
                  <td className={`${num} font-bold`}>{vi(total.d)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
