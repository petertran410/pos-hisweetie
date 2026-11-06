"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DonutChart,
  HBarChart,
  Panel,
} from "@/components/reports/analytics/shared/AnalyticsCharts";
import {
  AnalyticsTable,
  type AnalyticsColumn,
} from "@/components/reports/analytics/shared/AnalyticsTable";
import type {
  KpiDailyRow,
  KpiPage,
  KpiSaleDaily,
} from "@/lib/api/analytics-kpi-sale";
import { KpiMatrix, type MatrixMeasure, type MatrixRow } from "./KpiMatrix";
import { BLANK, fmtDate, num } from "./kpiFormat";

/** Trang Theo Ngày: nhóm hàng, tính thu nhập, thu nhập kỳ vọng, bảng dữ liệu tính KPI. */
export function DailyView({
  data,
  onPage,
}: {
  data: KpiSaleDaily;
  onPage: (page: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <Panel title="Doanh Số Theo Nhóm Hàng">
          <HBarChart
            rows={data.byGroup.map((r) => ({
              name: r.group ?? BLANK,
              value: r.revenue,
            }))}
            metric="amount"
            color="#00A5B5"
            maxHeight={260}
          />
        </Panel>
        <Panel title="Doanh Số Được Tính Thu Nhập">
          <DonutChart
            rows={data.byCheck.map((r) => ({ name: r.key, value: r.revenue }))}
            metric="amount"
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[2fr_3fr]">
        <Panel
          title="Bảng Tính Thu Nhập Kỳ Vọng"
          subtitle="Doanh thu được tính = dòng hàng thoả điều kiện tính thu nhập">
          <ExpectedMatrix data={data} />
        </Panel>
        <Panel
          title="Bảng Dữ Liệu Tính KPI Sale"
          subtitle={`${num(data.detail.total)} dòng · Doanh số ${num(data.detail.sum)}`}>
          <DetailTable detail={data.detail} onPage={onPage} />
        </Panel>
      </div>
    </div>
  );
}

function ExpectedMatrix({ data }: { data: KpiSaleDaily }) {
  const measures: MatrixMeasure[] = [
    { key: "revenue", label: "Doanh Số", format: num },
    { key: "income", label: "Doanh Thu Được Tính", format: num },
  ];
  // Nhân viên = dim_user[given_name] của người đại diện: khách "noname" và
  // hoá đơn không có khách cùng rơi vào dòng trống như Power BI.
  const users = new Map<
    string,
    { row: MatrixRow; kids: Map<string, MatrixRow> }
  >();
  const total: MatrixRow = { key: "__total", label: "Tổng", cells: {} };
  const add = (row: MatrixRow, rev: number | null, inc: number | null) => {
    const c = (row.cells[""] ??= { revenue: null, income: null });
    if (rev !== null) c.revenue = (c.revenue ?? 0) + rev;
    if (inc !== null) c.income = (c.income ?? 0) + inc;
  };
  for (const e of data.expected) {
    const key = e.name ?? "";
    let u = users.get(key);
    if (!u) {
      u = { row: { key, label: e.name ?? BLANK, cells: {} }, kids: new Map() };
      users.set(key, u);
    }
    const gk = e.group ?? "";
    let kid = u.kids.get(gk);
    if (!kid) {
      kid = { key: gk, label: e.group ?? BLANK, cells: {} };
      u.kids.set(gk, kid);
    }
    for (const r of [kid, u.row, total]) add(r, e.revenue, e.income);
  }
  const rows = [...users.values()]
    .map(({ row, kids }) => ({
      ...row,
      children: [...kids.values()].sort((a, b) =>
        (a.key || "~").localeCompare(b.key || "~", "vi"),
      ),
    }))
    .sort((a, b) => (a.key || "~").localeCompare(b.key || "~", "vi"));
  return (
    <KpiMatrix
      rowHeader="Nhân Viên › Nhóm Hàng"
      groups={[]}
      measures={measures}
      rows={rows}
      total={total}
      defaultExpanded
      maxHeight={640}
    />
  );
}

function DetailTable({
  detail,
  onPage,
}: {
  detail: KpiPage<KpiDailyRow>;
  onPage: (page: number) => void;
}) {
  const columns: AnalyticsColumn<KpiDailyRow>[] = [
    { key: "pic", label: "Nhân Viên PIC" },
    { key: "seller", label: "Người Bán" },
    { key: "code", label: "Mã Hóa Đơn" },
    {
      key: "date",
      label: "Ngày Mua",
      align: "center",
      format: (v) => fmtDate(String(v)),
    },
    {
      key: "customerCode",
      label: "Mã Khách",
      format: (v, r) => (
        <span title={r.customerName ?? ""}>{String(v ?? "")}</span>
      ),
    },
    { key: "customerType", label: "Loại Khách" },
    {
      key: "productName",
      label: "Tên Hàng",
      format: (v) => (
        <span className="block max-w-[260px] truncate" title={String(v ?? "")}>
          {String(v ?? "")}
        </span>
      ),
    },
    { key: "group", label: "Nhóm Hàng" },
    {
      key: "revenue",
      label: "Doanh Số",
      align: "right",
      format: (v) => num(v as number | null),
    },
    {
      key: "check",
      label: "Kiểm Tra",
      align: "center",
      color: (v) => (v === "Có" ? "#27AE60" : undefined),
    },
    { key: "productType", label: "Loại Hàng" },
  ];
  const pages = Math.max(1, Math.ceil(detail.total / detail.pageSize));
  return (
    <div className="space-y-2">
      <AnalyticsTable
        columns={columns}
        rows={detail.rows}
        rowKey={(r, i) => `${r.code}|${r.productName}|${i}`}
        maxHeight={600}
      />
      <Pager page={detail.page} pages={pages} onPage={onPage} />
    </div>
  );
}

export function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const go = (p: number) => onPage(Math.min(pages, Math.max(1, p)));
  const btn =
    "p-1.5 rounded-md border hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center justify-end gap-2 text-[12.5px]">
      <button
        type="button"
        className={btn}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        aria-label="Trang trước">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span>Trang</span>
      <PageInput key={page} page={page} onGo={go} />
      <span style={{ color: "var(--dt-text-muted)" }}>/ {num(pages)}</span>
      <button
        type="button"
        className={btn}
        disabled={page >= pages}
        onClick={() => go(page + 1)}
        aria-label="Trang sau">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Ô nhập số trang (key theo trang hiện tại để nạp lại khi đổi trang). */
function PageInput({
  page,
  onGo,
}: {
  page: number;
  onGo: (p: number) => void;
}) {
  const [input, setInput] = useState(String(page));
  return (
    <input
      className="w-14 border rounded-md px-2 py-1 text-center"
      value={input}
      onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
      onBlur={() => Number(input) !== page && onGo(Number(input) || 1)}
      onKeyDown={(e) => e.key === "Enter" && onGo(Number(input) || 1)}
    />
  );
}
