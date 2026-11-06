"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashSelect } from "@/components/dashboard/DashSelect";
import { FilterMultiSelect } from "@/components/ui/filters";
import type {
  HangTuanFilters,
  HangTuanMetrics,
  HangTuanReport as HangTuanData,
} from "@/lib/api/analytics-dinh-ki";
import { useHangTuan } from "@/lib/hooks/useAnalyticsDinhKi";
import { TOOLTIP_STYLE, metricAxis, metricLabel } from "../analyticsFormat";
import { BarText, Empty, Panel, axisTick } from "../shared/AnalyticsCharts";
import { fmtDate, fmtNum, fmtPct, vnNow } from "../dinh-ki/dkFormat";

// Màu của các thẻ HTML (card_*) trong dataset_sale - version 2.
const C = {
  navy: "#133E87",
  blue: "#608BC1",
  line: "#CBDCEB",
  green: "#1a9e6e",
  red: "#d63e58",
  orange: "#e07b30",
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

/** "#,##0.0" tỷ */
const ty = (v: number) =>
  (v / 1e9).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/**
 * Hằng Tuần › Kết Quả Hàng Tuần (report của dataset_sale - version 2):
 * thẻ KPI cá nhân vs phòng, doanh số theo tháng, hiệu suất nhân viên, lũy kế theo ngày.
 */
export function HangTuanReport() {
  const [now] = useState(vnNow);
  const thisYear = now.y;
  const [filters, setFilters] = useState<HangTuanFilters>({
    year: now.y,
    months: [now.m],
  });
  const { data, error, isLoading, isFetching } = useHangTuan(filters);
  const set = (patch: Partial<HangTuanFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  const opts = data?.options;
  const hasExtra = !!(
    filters.weeks?.length ||
    filters.saleTeamIds?.length ||
    filters.sellerGroups?.length
  );
  const years = Array.from(
    { length: thisYear - 2025 + 1 },
    (_, i) => thisYear - i,
  ).map((y) => ({ key: String(y), label: `Năm ${y}` }));

  return (
    <>
      <div className="dt-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="text-[11.5px] font-bold px-2.5 py-1 rounded-md text-white"
            style={{ background: C.blue }}>
            BỘ LỌC NHANH
          </span>
          <DashSelect
            ariaLabel="Năm"
            options={years}
            value={String(filters.year)}
            onChange={(k) => set({ year: Number(k), weeks: [] })}
            size="md"
          />
          <div className="flex-1" />
          {isFetching && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}
          {hasExtra && (
            <button
              type="button"
              onClick={() =>
                setFilters({ year: filters.year, months: filters.months })
              }
              className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
              style={{ color: "var(--dt-text-secondary)" }}>
              <RotateCcw className="w-3.5 h-3.5" />
              Xoá lọc
            </button>
          )}
        </div>
        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <FilterMultiSelect
            options={(opts?.teams ?? []).map((t) => ({
              value: String(t.id),
              label: t.name,
            }))}
            values={(filters.saleTeamIds ?? []).map(String)}
            onChange={(v) => set({ saleTeamIds: v.map(Number) })}
            placeholder="Nhóm Bán: Tất cả"
            searchable={false}
            multiLabel={(n) => `${n} nhóm bán`}
          />
          <FilterMultiSelect
            options={(opts?.sellerGroups ?? []).map((g) => ({
              value: g,
              label: g,
            }))}
            values={filters.sellerGroups ?? []}
            onChange={(v) => set({ sellerGroups: v })}
            placeholder="Người Bán: Tất cả"
            multiLabel={(n) => `${n} người bán`}
          />
          <FilterMultiSelect
            options={MONTH_OPTIONS.map((m) => ({
              value: m.value,
              label: `${filters.year}-${m.value.padStart(2, "0")}`,
            }))}
            values={(filters.months ?? []).map(String)}
            onChange={(v) =>
              set({ months: v.map(Number).sort((a, b) => a - b), weeks: [] })
            }
            placeholder="Tháng: Cả năm"
            searchable={false}
            multiLabel={(n) => `${n} tháng`}
          />
          <FilterMultiSelect
            options={(opts?.weeks ?? []).map((w) => ({
              value: w.start,
              label: w.label,
            }))}
            values={filters.weeks ?? []}
            onChange={(v) => set({ weeks: v })}
            placeholder="Tuần: Tất cả"
            multiLabel={(n) => `${n} tuần`}
          />
        </div>
      </div>

      {error ? (
        <div className="dt-panel p-6 text-center text-[13px] text-red-600">
          Không tải được báo cáo: {(error as Error).message}
        </div>
      ) : isLoading || !data ? (
        <div className="space-y-3">
          <div className="dt-sk h-[140px] rounded-xl" />
          <div className="dt-sk h-[300px] rounded-xl" />
          <div className="dt-sk h-[340px] rounded-xl" />
        </div>
      ) : data.empty ? (
        <div
          className="dt-panel p-8 text-center text-[13px]"
          style={{ color: "var(--dt-text-muted)" }}>
          Bộ lọc đang chọn chưa có ngày nào.
        </div>
      ) : (
        <>
          <div
            className="text-[12px]"
            style={{ color: "var(--dt-text-muted)" }}>
            Đang xem: {fmtDate(data.selection.from)} – {fmtDate(data.refDate)}
            {" · "}Các thẻ tính tới ngày {fmtDate(data.refDate)} (ngày cuối của
            bộ lọc)
          </div>
          <Cards c={data.cards} />
          <div className="grid gap-3 grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start">
            <Panel
              title="Doanh số qua từng tuần"
              subtitle="Theo tháng của bộ lọc">
              <MonthChart rows={data.byMonth} />
            </Panel>
            <Panel title="Hiệu suất nhân viên sale">
              <PivotTable rows={data.pivot} total={data.total} />
            </Panel>
          </div>
          <Panel title="Doanh số lũy kế theo ngày">
            <CumulativeChart rows={data.cumulative} />
          </Panel>
          <div
            className="text-[11.5px] text-right"
            style={{ color: "var(--dt-text-muted)" }}>
            Dữ liệu cập nhật vào lúc{" "}
            {new Date(data.updatedAt).toLocaleString("vi-VN")}
          </div>
        </>
      )}
    </>
  );
}

// ── Thẻ (card_*) ─────────────────────────────────────────────────────────────
function Card({
  accent,
  title,
  children,
}: {
  accent: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-xl border px-4 py-3.5 min-w-0"
      style={{ borderColor: C.line, borderLeft: `4px solid ${accent}` }}>
      <div
        className="text-[11.5px] font-semibold mb-2"
        style={{ color: C.blue }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Big({
  value,
  unit,
  color = C.navy,
}: {
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <div
      className="text-[26px] font-bold leading-none dt-mono"
      style={{ color }}>
      {value}
      {unit && (
        <span
          className="text-[14px] font-medium ml-1"
          style={{ color: C.blue }}>
          {unit}
        </span>
      )}
    </div>
  );
}

function Split({
  self,
  selfLeft,
  dept,
  deptLeft,
}: {
  self: number;
  selfLeft: number;
  dept: number;
  deptLeft: number;
}) {
  const half = (
    label: string,
    v: number,
    left: number,
    color: string,
    border: boolean,
  ) => (
    <div
      className={`flex-1 min-w-0 ${border ? "border-l pl-3" : ""}`}
      style={{ borderColor: C.line }}>
      <div
        className="text-[9.5px] uppercase tracking-wide mb-1"
        style={{ color: C.blue }}>
        {label}
      </div>
      <div
        className="text-[22px] font-bold leading-none dt-mono"
        style={{ color }}>
        {ty(v)}{" "}
        <span className="text-[12px] font-medium" style={{ color: C.blue }}>
          tỷ
        </span>
      </div>
      <div className="text-[10.5px] mt-1" style={{ color: C.orange }}>
        Còn {ty(left)} tỷ
      </div>
    </div>
  );
  return (
    <div className="flex gap-3">
      {half("Cá nhân", self, selfLeft, C.navy, false)}
      {half("Cả phòng KD", dept, deptLeft, C.blue, true)}
    </div>
  );
}

type HangTuanCards = Extract<HangTuanData, { empty: false }>["cards"];

function Cards({ c }: { c: HangTuanCards }) {
  const mom = c.mom;
  const momUp = mom === null || mom >= 0;
  const ar = c.achieved;
  const arColor =
    ar === null ? C.red : ar >= 1 ? C.green : ar >= 0.4 ? C.navy : C.red;
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
      <Card accent={C.navy} title="Doanh số tuần được chọn · Cá nhân vs Phòng">
        <Split
          self={c.selectedWeek}
          selfLeft={c.selectedWeekRemaining}
          dept={c.deptSelectedWeek}
          deptLeft={c.deptSelectedWeekRemaining}
        />
      </Card>
      <Card accent={C.blue} title="Chỉ tiêu tháng (KPI) · Cá nhân vs Phòng">
        <Split
          self={c.kpi}
          selfLeft={c.remaining}
          dept={c.deptKpi}
          deptLeft={c.deptRemaining}
        />
      </Card>
      <Card accent={C.navy} title="Doanh số MTD (tháng này)">
        <Big value={ty(c.revenueMtd)} unit="tỷ" />
        <div
          className="text-[11.5px] mt-2"
          style={{ color: momUp ? C.green : C.red }}>
          Cùng kỳ tháng trước {ty(c.previousMtd)} tỷ · {momUp ? "▲" : "▼"}{" "}
          {fmtPct(mom)} MoM
        </div>
      </Card>
      <Card accent={C.blue} title="Chỉ tiêu tháng (KPI)">
        <Big value={ty(c.kpi)} unit="tỷ" />
        <div className="text-[11.5px] mt-2" style={{ color: C.blue }}>
          Còn cần đạt {ty(c.remaining)} tỷ
        </div>
      </Card>
      <Card accent={arColor} title="% Hoàn thành tháng (AR)">
        <Big value={fmtPct(ar)} color={arColor} />
        <div
          className="h-1.5 rounded mt-3 overflow-hidden"
          style={{ background: C.line }}>
          <div
            className="h-full"
            style={{
              width: `${Math.min(1, Math.max(0, ar ?? 0)) * 100}%`,
              background: arColor,
            }}
          />
        </div>
      </Card>
      <Card accent={C.orange} title="Doanh số còn cần đạt">
        <Big value={ty(c.remaining)} unit="tỷ" color={C.orange} />
        <div className="text-[11.5px] mt-2" style={{ color: C.blue }}>
          để hoàn thành KPI tháng
        </div>
      </Card>
      <Card accent={C.blue} title="DS khách hàng mới">
        <Big value={fmtNum(c.revenueNew / 1e6)} unit="tr" />
        <div className="text-[11.5px] mt-2" style={{ color: C.blue }}>
          KH phát sinh lần đầu
        </div>
      </Card>
    </div>
  );
}

// ── Biểu đồ ──────────────────────────────────────────────────────────────────
function MonthChart({ rows }: { rows: { key: string; revenue: number }[] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E3EEF0"
          />
          <XAxis
            dataKey="key"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => metricAxis(Number(v), "amount")}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ fill: "rgba(96,139,193,0.08)" }}
            formatter={(v) => [metricLabel(Number(v), "amount"), "Doanh Số"]}
          />
          <Bar
            dataKey="revenue"
            name="Doanh Số"
            fill={C.blue}
            radius={[4, 4, 0, 0]}
            maxBarSize={56}>
            <LabelList
              dataKey="revenue"
              content={(p) => (
                <BarText
                  {...p}
                  text={metricLabel(Number(p.value), "amount")}
                  side="top"
                />
              )}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CumulativeChart({
  rows,
}: {
  rows: { label: string; revenue: number; kpi: number }[];
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#E3EEF0"
          />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) => metricAxis(Number(v), "amount")}
            label={{
              value: "Giá trị lũy kế",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#5A8A92" },
            }}
          />
          <Tooltip
            {...TOOLTIP_STYLE}
            formatter={(v, n) => [metricLabel(Number(v), "amount"), String(n)]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Doanh số lũy kế"
            stroke={C.blue}
            strokeWidth={2}
            fill={C.blue}
            fillOpacity={0.18}
            dot={{ r: 2.5 }}
          />
          <Line
            type="monotone"
            dataKey="kpi"
            name="KPI lũy kế"
            stroke={C.orange}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Pivot "Hiệu suất nhân viên sale" ─────────────────────────────────────────
type PivotRow = HangTuanMetrics & { name: string };

const COLS: { key: keyof HangTuanMetrics; label: string; pct?: boolean }[] = [
  { key: "kpi", label: "KPI Tháng" },
  { key: "revenue", label: "DS Tháng Này" },
  { key: "kpiPct", label: "% Hiệu Quả", pct: true },
  { key: "previousMtd", label: "DS Cùng Kì Tháng Trước" },
  { key: "mom", label: "% MoM", pct: true },
  { key: "thisWeek", label: "DS Tuần Này" },
  { key: "lastWeek", label: "DS Tuần Trước" },
  { key: "wow", label: "% WoW", pct: true },
];

function PivotTable({
  rows,
  total,
}: {
  rows: (PivotRow & { users: PivotRow[] })[];
  total: HangTuanMetrics;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (name: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  const cell = (r: HangTuanMetrics, c: (typeof COLS)[number]) => {
    const v = r[c.key];
    if (v === null || v === undefined) return "";
    return c.pct ? fmtPct(v) : fmtNum(v);
  };
  const td = "px-2.5 py-1.5 text-right dt-mono whitespace-nowrap";
  return (
    <div
      className="border rounded-lg overflow-auto max-h-[520px]"
      style={{ borderColor: "var(--dt-border)" }}>
      <table className="w-full text-[12.5px] border-collapse">
        <thead className="sticky top-0 z-10" style={{ background: C.line }}>
          <tr>
            <th className="px-2.5 py-2 text-left font-semibold">Người Bán</th>
            {COLS.map((c) => (
              <th
                key={c.key}
                className="px-2.5 py-2 text-center font-semibold whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={COLS.length + 1}
                className="p-6 text-center"
                style={{ color: "var(--dt-text-muted)" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
          {rows.map((g) => (
            <Fragment key={g.name}>
              <tr
                className="border-t"
                style={{ borderColor: "var(--dt-border)" }}>
                <td className="px-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => toggle(g.name)}
                    disabled={!g.users.length}
                    className="inline-flex items-center gap-1 font-semibold text-left disabled:cursor-default">
                    {g.users.length ? (
                      open.has(g.name) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <span className="w-3.5" />
                    )}
                    {g.name}
                  </button>
                </td>
                {COLS.map((c) => (
                  <td key={c.key} className={td}>
                    {cell(g, c)}
                  </td>
                ))}
              </tr>
              {open.has(g.name) &&
                g.users.map((u) => (
                  <tr
                    key={`${g.name}|${u.name}`}
                    className="border-t"
                    style={{
                      borderColor: "var(--dt-border)",
                      background: "#FAFCFD",
                    }}>
                    <td className="px-2.5 py-1.5 pl-8">{u.name}</td>
                    {COLS.map((c) => (
                      <td key={c.key} className={td}>
                        {cell(u, c)}
                      </td>
                    ))}
                  </tr>
                ))}
            </Fragment>
          ))}
        </tbody>
        <tfoot className="sticky bottom-0" style={{ background: "#F3F8F9" }}>
          <tr
            className="border-t font-bold"
            style={{ borderColor: "var(--dt-border)" }}>
            <td className="px-2.5 py-2">Tổng</td>
            {COLS.map((c) => (
              <td key={c.key} className={td}>
                {cell(total, c)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
