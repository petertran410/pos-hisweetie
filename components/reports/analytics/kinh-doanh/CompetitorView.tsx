"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Landmark } from "lucide-react";
import type {
  BrandSide,
  CompetitorData,
  KdFilters,
  NewCustomerCell,
  PlanCell,
  PivotDim,
} from "@/lib/api/analytics-kinh-doanh";
import { Panel } from "../shared/AnalyticsCharts";
import { AnalyticsTable } from "../shared/AnalyticsTable";
import { KdPivot } from "./KdPivot";

/** Bảng "Tổng hợp…" của trang Đối Thủ (trang gửi sớm request với cột mặc định = tháng). */
export const COMPETITOR_PIVOT_ROWS: PivotDim[] = [
  "sale_admin_pic",
  "parent_name",
  "product_name",
];
import { BarCell, Block, MiniTable, Unavailable } from "./KdUi";
import { C, fmtDate, full, int, pbiTargetColor, pct, tr, ty } from "./kdFormat";

/** Trang Đối Thủ (Power BI "Báo Cáo Kinh Doanh" › Đối Thủ). */
export function CompetitorView({
  data,
  filters,
}: {
  data: CompetitorData;
  filters: KdFilters;
}) {
  const [cols, setCols] = useState<"month" | "week">("month");
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_3fr]">
        <div className="dt-panel p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Landmark className="w-4 h-4" style={{ color: "#C0392B" }} />
            Nợ Hiện Tại
          </div>
          <div className="text-[26px] font-bold mt-1">
            {ty(data.debt.value)}
          </div>
          <div
            className="text-[12px] mt-1"
            style={{ color: "var(--dt-text-muted)" }}>
            {data.debt.rate === null
              ? "Chưa có chỉ tiêu năm"
              : `Đã đạt được ${pct(data.debt.rate, 2)} mục tiêu năm`}
          </div>
        </div>
        <BrandCompare data={data.brandCompare} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Đánh giá hiệu quả nhân sự theo tháng"
          subtitle="Thực tế = doanh số; Kế hoạch = KPI Sale tháng của nhóm">
          <PlanMatrix
            first="Tháng"
            teams={data.teams}
            rows={data.staffMonth.map((r) => ({
              key: r.key,
              label: r.label,
              cells: r.cells,
            }))}
          />
        </Panel>
        <Panel
          title="Đánh giá hiệu quả nhân sự theo tuần"
          subtitle="Kế hoạch tuần = KPI tháng ÷ 4">
          <PlanMatrix
            first="Tuần"
            teams={data.teams}
            rows={data.staffWeek.map((r) => ({
              key: r.key,
              label: r.label,
              cells: r.cells,
            }))}
          />
        </Panel>
      </div>

      <Panel
        title="Kết quả doanh số theo từng nhóm hàng theo tuần"
        subtitle="Thực tế = doanh số dòng hàng; Kế hoạch = chỉ tiêu tháng của nhóm hàng ÷ 4">
        <PlanMatrix
          first="Nhóm hàng"
          teams={data.weeks.map((w) => w.key)}
          teamLabels={Object.fromEntries(
            data.weeks.map((w) => [w.key, w.label]),
          )}
          rows={data.groupWeek.map((r) => ({
            key: r.key ?? "(Trống)",
            label: r.key === "__total__" ? "Tổng" : (r.key ?? "(Trống)"),
            cells: r.cells,
          }))}
          noTotalCol
        />
      </Panel>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Khách hàng mới phát sinh"
          subtitle="Hoá đơn của khách mua lần đầu trong tháng">
          <NewCustomerMatrix data={data} />
        </Panel>
        <Panel title="Dữ liệu chi tiết về khách hàng mới phát sinh">
          <AnalyticsTable
            columns={[
              { key: "team", label: "Nhóm bán" },
              { key: "code", label: "Mã khách" },
              { key: "name", label: "Tên khách" },
              { key: "month", label: "Tháng mua đầu tiên" },
              {
                key: "lastDate",
                label: "Ngày mua gần nhất trong tháng",
                format: (v) => (v ? fmtDate(String(v)) : ""),
              },
              {
                key: "orders",
                label: "Tổng hóa đơn",
                align: "right",
                format: (v) => int(Number(v)),
              },
              {
                key: "revenue",
                label: "Tổng doanh số",
                align: "right",
                format: (v) => full(Number(v)),
              },
            ]}
            rows={data.newCustomerList}
            rowKey={(r, i) => `${r.code}-${r.month}-${r.team}-${i}`}
            maxHeight={420}
          />
        </Panel>
      </div>

      <Panel
        title="Tổng hợp doanh số theo khách hàng"
        subtitle="Nhóm khách (Sale Admin) › Khách cha › Sản phẩm"
        right={
          <div className="dt-seg dt-seg-sm">
            {(["month", "week"] as const).map((c) => (
              <button
                key={c}
                type="button"
                data-on={cols === c}
                onClick={() => setCols(c)}>
                {c === "month" ? "Tháng" : "Tuần"}
              </button>
            ))}
          </div>
        }>
        <KdPivot
          filters={filters}
          rows={COMPETITOR_PIVOT_ROWS}
          rowLabel="Nhóm Khách / Tên Khách Cha / Tên Sản Phẩm"
          cols={cols}
          measures={[{ key: "metric", label: "Giá trị" }]}
        />
      </Panel>

      <Unavailable
        title="Theo dõi theo doanh số nhóm khách"
        reason="Power BI đọc bảng dim_kpi_sale_customer_group (kế hoạch theo nhóm khách), bảng này không còn trong mô hình dataset_sale và chưa có chỉ tiêu tương ứng trong POS."
      />
    </div>
  );
}

function BrandCompare({ data }: { data: CompetitorData["brandCompare"] }) {
  const totRev = data.lermao.revenue + data.boduo.revenue || 1;
  const wL = Math.round((data.lermao.revenue / totRev) * 100);
  const side = (name: string, s: BrandSide, color: string, bg: string) => (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: color, background: bg }}>
      <div className="text-[12px] font-bold" style={{ color }}>
        {name}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1.5 text-[12px]">
        <div>
          <div style={{ color: C.muted }}>Doanh thu</div>
          <div className="text-[18px] font-semibold" style={{ color }}>
            {ty(s.revenue)}
          </div>
        </div>
        <div>
          <div style={{ color: C.muted }}>Sản lượng</div>
          <div className="text-[18px] font-semibold">{int(s.quantity)}</div>
        </div>
        <div>
          <div style={{ color: C.muted }}>Đơn hàng</div>
          <div className="font-semibold">{int(s.orders)}</div>
        </div>
        <div>
          <div style={{ color: C.muted }}>Khách hàng</div>
          <div className="font-semibold">{int(s.customers)}</div>
        </div>
      </div>
    </div>
  );
  const top = (rows: typeof data.topLermao, color: string) => {
    const max = Math.max(
      1,
      ...data.topLermao.map((r) => r.amount),
      ...data.topBoduo.map((r) => r.amount),
    );
    return (
      <MiniTable
        head={[
          { label: "Sản phẩm" },
          { label: "Doanh thu", width: "40%" },
          { label: "Sản lượng", align: "right" },
        ]}
        rows={rows.map((r) => [
          <span key="n" className="line-clamp-1" title={r.name ?? ""}>
            {r.name ?? "(Trống)"}
          </span>,
          <BarCell
            key="b"
            width={(r.amount / max) * 100}
            text={tr(r.amount)}
            color={color}
            minText={60}
          />,
          int(r.quantity),
        ])}
      />
    );
  };
  return (
    <div className="dt-panel p-4 space-y-3 min-w-0">
      <div className="text-[15px] font-bold">
        So sánh Mứt Lermao vs Mứt Boduo
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {side("MỨT LERMAO", data.lermao, C.accent, "#FBE6DA")}
        {side("MỨT BODUO", data.boduo, C.primary, "#E5E8F5")}
      </div>
      <div>
        <div className="text-[12px] mb-1" style={{ color: C.muted }}>
          Tỷ trọng doanh thu (Lermao vs Boduo)
        </div>
        <div className="flex h-7 rounded-md overflow-hidden text-white text-[13px] font-semibold">
          <div
            className="grid place-items-center"
            style={{ width: `${wL}%`, background: C.accent }}>
            {wL >= 8 ? `Lermao ${wL}%` : ""}
          </div>
          <div
            className="grid place-items-center"
            style={{ width: `${100 - wL}%`, background: C.primary }}>
            {100 - wL >= 8 ? `Boduo ${100 - wL}%` : ""}
          </div>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <Block title="● So sánh theo vị mứt (sản lượng)">
          <MiniTable
            head={[
              { label: "Vị mứt" },
              { label: "Lermao (SL)", align: "right" },
              { label: "Boduo (SL)", align: "right" },
              { label: "Tổng", align: "right" },
              { label: "L / B (%)", align: "right" },
              { label: "Vượt trội" },
            ]}
            rows={data.flavors.map((f) => {
              const tot = f.lermao + f.boduo;
              const wl = tot ? Math.round((f.lermao / tot) * 100) : 0;
              return [
                f.flavor,
                int(f.lermao),
                int(f.boduo),
                int(tot),
                `${wl} / ${tot ? 100 - wl : 0}`,
                <span
                  key="w"
                  style={{
                    color: f.lermao >= f.boduo ? C.accent : C.primary,
                    fontWeight: 600,
                  }}>
                  {f.lermao === f.boduo
                    ? "Ngang"
                    : f.lermao > f.boduo
                      ? "Lermao"
                      : "Boduo"}
                </span>,
              ];
            })}
          />
        </Block>
        <Block title="★ Top 10 sản phẩm Lermao">
          {top(data.topLermao, C.accent)}
        </Block>
        <Block title="★ Top 10 sản phẩm Boduo">
          {top(data.topBoduo, C.primary)}
        </Block>
      </div>
    </div>
  );
}

/** Ma trận Thực tế / Kế hoạch / % Hiệu quả theo cột (nhóm bán hoặc tuần). */
function PlanMatrix({
  first,
  teams,
  teamLabels,
  rows,
  noTotalCol,
}: {
  first: string;
  teams: string[];
  teamLabels?: Record<string, string>;
  rows: { key: string; label: string; cells: Record<string, PlanCell> }[];
  noTotalCol?: boolean;
}) {
  const colKeys = noTotalCol ? teams : [...teams, "__total__"];
  return (
    <div
      className="border rounded-lg overflow-auto max-h-[480px]"
      style={{ borderColor: "var(--dt-border)" }}>
      <table className="text-[12px] border-collapse min-w-full">
        <thead className="sticky top-0 z-10" style={{ background: "#F3F8F9" }}>
          <tr>
            <th
              rowSpan={2}
              className="sticky left-0 z-20 px-2.5 py-2 text-left border-b"
              style={{ background: "#F3F8F9" }}>
              {first}
            </th>
            {colKeys.map((t) => (
              <th
                key={t}
                colSpan={3}
                className="px-2.5 py-1.5 text-center border-b border-l whitespace-nowrap">
                {t === "__total__" ? "Tổng" : (teamLabels?.[t] ?? t)}
              </th>
            ))}
          </tr>
          <tr>
            {colKeys.map((t) =>
              ["Thực tế", "Kế hoạch", "% Hiệu quả"].map((l) => (
                <th
                  key={`${t}-${l}`}
                  className="px-2.5 py-1 text-right border-b border-l font-medium whitespace-nowrap">
                  {l}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              className="border-b"
              style={{ borderColor: "var(--dt-border)" }}>
              <td className="sticky left-0 bg-white px-2.5 py-1 whitespace-nowrap font-medium">
                {r.label}
              </td>
              {colKeys.map((t) => {
                const c = r.cells[t];
                return (
                  <Fragment key={t}>
                    <td className="px-2.5 py-1 text-right dt-mono border-l">
                      {c?.actual ? full(c.actual) : ""}
                    </td>
                    <td className="px-2.5 py-1 text-right dt-mono">
                      {c?.plan ? full(c.plan) : ""}
                    </td>
                    <td
                      className="px-2.5 py-1 text-right dt-mono"
                      style={{ color: pbiTargetColor(c?.rate) }}>
                      {c?.rate === null || c?.rate === undefined
                        ? ""
                        : pct(c.rate, 2)}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewCustomerMatrix({ data }: { data: CompetitorData }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const cols = [...data.newTeams, "__total__"];
  const cells = (c: Record<string, NewCustomerCell>) =>
    cols.map((t) => (
      <Fragment key={t}>
        <td className="px-2.5 py-1 text-right dt-mono border-l">
          {c[t]?.revenue ? full(c[t].revenue) : ""}
        </td>
        <td className="px-2.5 py-1 text-right dt-mono">
          {c[t]?.orders ? int(c[t].orders) : ""}
        </td>
        <td className="px-2.5 py-1 text-right dt-mono">
          {c[t]?.customers ? int(c[t].customers) : ""}
        </td>
      </Fragment>
    ));
  return (
    <div
      className="border rounded-lg overflow-auto max-h-[420px]"
      style={{ borderColor: "var(--dt-border)" }}>
      <table className="text-[12px] border-collapse min-w-full">
        <thead className="sticky top-0 z-10" style={{ background: "#F3F8F9" }}>
          <tr>
            <th
              rowSpan={2}
              className="sticky left-0 z-20 px-2.5 py-2 text-left border-b"
              style={{ background: "#F3F8F9" }}>
              Tháng / Tuần
            </th>
            {cols.map((t) => (
              <th
                key={t}
                colSpan={3}
                className="px-2.5 py-1.5 text-center border-b border-l whitespace-nowrap">
                {t === "__total__" ? "Tổng" : t}
              </th>
            ))}
          </tr>
          <tr>
            {cols.map((t) =>
              ["Doanh số", "Tổng số hóa đơn", "Tổng khách hàng"].map((l) => (
                <th
                  key={`${t}-${l}`}
                  className="px-2.5 py-1 text-right border-b border-l font-medium whitespace-nowrap">
                  {l}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {data.newCustomers.map((r) => {
            const isTotal = r.key === "__total__";
            const isOpen = !!open[r.key];
            return (
              <Fragment key={r.key}>
                <tr
                  className={`border-b ${isTotal ? "font-bold bg-[#F3F8F9]" : ""}`}
                  style={{ borderColor: "var(--dt-border)" }}>
                  <td className="sticky left-0 bg-white px-2.5 py-1 whitespace-nowrap">
                    {isTotal ? (
                      "Tổng"
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium"
                        onClick={() =>
                          setOpen((o) => ({ ...o, [r.key]: !isOpen }))
                        }>
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        {r.key}
                      </button>
                    )}
                  </td>
                  {cells(r.cells)}
                </tr>
                {isOpen &&
                  r.weeks.map((w) => (
                    <tr
                      key={w.key}
                      className="border-b"
                      style={{ borderColor: "var(--dt-border)" }}>
                      <td className="sticky left-0 bg-white px-2.5 py-1 pl-8 whitespace-nowrap">
                        {w.label}
                      </td>
                      {cells(w.cells)}
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
