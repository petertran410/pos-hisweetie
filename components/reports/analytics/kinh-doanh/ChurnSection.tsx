"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { KdFilters } from "@/lib/api/analytics-kinh-doanh";
import { useKdChurn } from "@/lib/hooks/useAnalyticsKinhDoanh";
import { BLANK_LABEL, metricLabel } from "../analyticsFormat";
import { DonutChart, Panel } from "../shared/AnalyticsCharts";
import { ErrorBox, Skeleton, ViewTabs } from "./KdUi";
import { fmtDate, int } from "./kdFormat";

const GROUPS = [
  { key: "1.Khách Churn", label: "Khách Churn" },
  { key: "2.Khách bỏ mã", label: "Khách bỏ mã" },
  { key: "all", label: "Tất cả" },
];

/** Bookmark "Churn Customer": danh sách khách đã lâu chưa mua (dim_customers[churn_sale_group]). */
export function ChurnSection({ filters }: { filters: KdFilters }) {
  const [group, setGroup] = useState("1.Khách Churn");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { data, isLoading, error } = useKdChurn(filters, group);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ViewTabs value={group} onChange={setGroup} options={GROUPS} />
        <span className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
          Khách Churn: buôn 10–45 ngày, chuỗi 15–45, lẻ 30–60 ngày chưa mua · Bỏ
          mã: lâu hơn
        </span>
      </div>
      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !data ? (
        <Skeleton blocks={1} />
      ) : (
        <div className="grid gap-3 xl:grid-cols-[3fr_1fr]">
          <Panel
            title="Danh Sách Khách Đã Lâu Chưa Mua Hàng"
            subtitle={`${data.customerCount} khách có mua trong kỳ${data.customerCount > data.customers.length ? ` · hiện ${data.customers.length}` : ""}`}>
            <div
              className="border rounded-lg overflow-auto max-h-[560px]"
              style={{ borderColor: "var(--dt-border)" }}>
              <table className="w-full text-[12px] border-collapse">
                <thead
                  className="sticky top-0"
                  style={{ background: "#F3F8F9" }}>
                  <tr>
                    <th className="px-2.5 py-2 text-left">
                      Tên Khách Hàng / Tên Sản Phẩm
                    </th>
                    <th className="px-2.5 py-2 text-right">Giá Trị</th>
                    <th className="px-2.5 py-2 text-right">
                      Lần Cuối Đặt Hàng
                    </th>
                    <th className="px-2.5 py-2 text-right">
                      Số Ngày Chưa Mua Hàng
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((c) => {
                    const k = c.code ?? "";
                    return (
                      <Fragment key={k}>
                        <tr
                          className="border-t"
                          style={{ borderColor: "var(--dt-border)" }}>
                          <td className="px-2.5 py-1">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 font-medium text-left"
                              onClick={() =>
                                setOpen((o) => ({ ...o, [k]: !o[k] }))
                              }>
                              {open[k] ? (
                                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                              )}
                              {c.name ?? BLANK_LABEL}
                            </button>
                          </td>
                          <td className="px-2.5 py-1 text-right dt-mono">
                            {metricLabel(c.value, data.metric)}
                          </td>
                          <td className="px-2.5 py-1 text-right dt-mono">
                            {c.lastOrder ? fmtDate(c.lastOrder) : ""}
                          </td>
                          <td className="px-2.5 py-1 text-right dt-mono">
                            {c.churnDays === null ? "" : int(c.churnDays)}
                          </td>
                        </tr>
                        {open[k] &&
                          c.products.map((p, i) => (
                            <tr
                              key={`${k}-${i}`}
                              className="border-t"
                              style={{ borderColor: "var(--dt-border)" }}>
                              <td className="px-2.5 py-1 pl-9">
                                {p.name ?? BLANK_LABEL}
                              </td>
                              <td className="px-2.5 py-1 text-right dt-mono">
                                {metricLabel(p.value, data.metric)}
                              </td>
                              <td />
                              <td />
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel
            title="Theo người bán"
            subtitle="Số khách (cha) lâu chưa mua theo Sale PIC">
            <DonutChart
              rows={data.bySalePic.map((r) => ({
                name: r.key,
                value: r.value,
              }))}
              metric="customers"
            />
          </Panel>
        </div>
      )}
    </div>
  );
}
