"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import {
  AnalyticsTable,
  type AnalyticsColumn,
} from "@/components/reports/analytics/shared/AnalyticsTable";
import type { KpiSaleOrder } from "@/lib/api/analytics-kpi-sale";
import { Pager } from "./DailyView";
import { KpiMatrix, type MatrixMeasure, type MatrixRow } from "./KpiMatrix";
import { BLANK, num } from "./kpiFormat";

type CustomerRow = KpiSaleOrder["customers"]["rows"][number];

/**
 * Trang Lên Đơn Hộ: người bán (người tạo hoá đơn) so với người đại diện của
 * khách, và doanh thu theo từng khách.
 */
export function OrderOnBehalfView({
  data,
  search,
  onSearch,
  onPage,
}: {
  data: KpiSaleOrder;
  search: string;
  onSearch: (s: string) => void;
  onPage: (p: number) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[2fr_3fr]">
      <Panel
        title="Người Bán › Người Đại Diện"
        subtitle="Doanh thu và số hoá đơn theo người lên đơn, tách theo người đại diện của khách">
        <SellerMatrix data={data} />
      </Panel>
      <Panel
        title="Doanh thu theo khách"
        subtitle={`${num(data.customers.total)} khách · Doanh thu ${num(data.customers.sum)}`}
        right={<SearchBox value={search} onSearch={onSearch} />}>
        <CustomerTable data={data} onPage={onPage} />
      </Panel>
    </div>
  );
}

function SellerMatrix({ data }: { data: KpiSaleOrder }) {
  const measures: MatrixMeasure[] = [
    { key: "revenue", label: "Doanh Thu", format: num },
    { key: "invoices", label: "Hóa Đơn", format: num },
  ];
  const sellers = new Map<string, { row: MatrixRow; kids: MatrixRow[] }>();
  const total: MatrixRow = { key: "__total", label: "Tổng", cells: {} };
  const add = (row: MatrixRow, rev: number | null, inv: number) => {
    const c = (row.cells[""] ??= { revenue: null, invoices: null });
    if (rev !== null) c.revenue = (c.revenue ?? 0) + rev;
    c.invoices = (c.invoices ?? 0) + inv;
  };
  for (const r of data.bySeller) {
    const key = r.seller ?? "";
    let s = sellers.get(key);
    if (!s) {
      s = { row: { key, label: r.seller ?? BLANK, cells: {} }, kids: [] };
      sellers.set(key, s);
    }
    const kid: MatrixRow = {
      key: r.rep ?? "",
      label: r.rep ?? BLANK,
      cells: {},
    };
    add(kid, r.revenue, r.invoices);
    s.kids.push(kid);
    add(s.row, r.revenue, r.invoices);
    add(total, r.revenue, r.invoices);
  }
  const rows = [...sellers.values()]
    .map(({ row, kids }) => ({
      ...row,
      children: kids.sort((a, b) => (a.key || "~").localeCompare(b.key || "~")),
    }))
    .sort((a, b) => (a.key || "~").localeCompare(b.key || "~", "vi"));
  return (
    <KpiMatrix
      rowHeader="Người Bán › Người Đại Diện"
      groups={[]}
      measures={measures}
      rows={rows}
      total={rows.length ? total : null}
      maxHeight={680}
    />
  );
}

function CustomerTable({
  data,
  onPage,
}: {
  data: KpiSaleOrder;
  onPage: (p: number) => void;
}) {
  const c = data.customers;
  const columns: AnalyticsColumn<CustomerRow>[] = [
    { key: "code", label: "Mã Khách" },
    {
      key: "name",
      label: "Tên Khách",
      format: (v) => (
        <span className="block max-w-[320px] truncate" title={String(v ?? "")}>
          {String(v ?? "")}
        </span>
      ),
    },
    { key: "salePic", label: "Người PIC" },
    { key: "rep", label: "Người Đại Diện" },
    {
      key: "revenue",
      label: "Doanh Thu",
      align: "right",
      format: (v) => num(v as number | null),
    },
  ];
  return (
    <div className="space-y-2">
      <AnalyticsTable
        columns={columns}
        rows={c.rows}
        rowKey={(r, i) => `${r.code}|${r.rep}|${i}`}
        maxHeight={620}
      />
      <Pager
        page={c.page}
        pages={Math.max(1, Math.ceil(c.total / c.pageSize))}
        onPage={onPage}
      />
    </div>
  );
}

function SearchBox({
  value,
  onSearch,
}: {
  value: string;
  onSearch: (s: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="relative w-56">
      <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className="w-full border rounded-lg pl-8 pr-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--dt-primary)]"
        placeholder="Tìm mã / tên khách"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() !== value && onSearch(text.trim())}
        onKeyDown={(e) => e.key === "Enter" && onSearch(text.trim())}
      />
    </div>
  );
}
