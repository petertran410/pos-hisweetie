"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type {
  KdFilters,
  PivotCells,
  PivotDim,
  PivotParams,
  PivotResult,
} from "@/lib/api/analytics-kinh-doanh";
import { useKdPivot } from "@/lib/hooks/useAnalyticsKinhDoanh";
import { full, pbiGrowthColor, pct } from "./kdFormat";

// Matrix Power BI nhiều cấp: tải từng cấp khi mở nút (+). Cột = tháng / tuần + Tổng.

export type PivotMeasure =
  | "metric" // switch_dynamics_metrics (theo chỉ số đang chọn)
  | "amount"
  | "orders"
  | "quantity"
  | "customers"
  | "growth"; // MoM / WoW (%)

const IDX: Record<AnalyticsMetric, number> = {
  amount: 0,
  orders: 1,
  quantity: 2,
  customers: 3,
};
const NULL_TOKEN = "__null__";

interface Props {
  filters: KdFilters;
  rows: PivotDim[];
  rowLabel: string;
  cols?: "month" | "week" | "none";
  growth?: "mom" | "wow" | "none";
  detail?: boolean;
  measures: { key: PivotMeasure; label: string }[];
  maxHeight?: number;
  /** Tô nền theo độ lớn giá trị (data bar / heatmap của Power BI). */
  heat?: boolean;
}

export function KdPivot(props: Props) {
  const { filters, rows, cols = "month", growth = "none", detail } = props;
  const params: PivotParams = { rows, cols, growth, detail };
  const { data, isLoading, error, isFetching } = useKdPivot(filters, params);

  if (error)
    return (
      <div className="text-[12.5px] text-red-600 p-3">
        Không tải được: {(error as Error).message}
      </div>
    );
  if (isLoading || !data) return <div className="dt-sk h-[220px] rounded-lg" />;

  const colKeys = [...data.columns.map((c) => c.key), "T"];
  const colLabels = [...data.columns.map((c) => c.label), "Tổng"];
  const metric = data.metric;
  const maxVal = props.heat
    ? Math.max(
        1,
        ...data.rows.flatMap((r) =>
          data.columns.map((c) => r.v[c.key]?.[IDX[metric]] ?? 0),
        ),
      )
    : 1;

  return (
    <div
      className="border rounded-lg overflow-auto relative"
      style={{
        maxHeight: props.maxHeight ?? 560,
        borderColor: "var(--dt-border)",
      }}>
      {isFetching && (
        <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2 top-2 z-30 text-gray-400" />
      )}
      <table className="text-[12px] border-collapse min-w-full">
        <thead className="sticky top-0 z-20" style={{ background: "#F3F8F9" }}>
          <tr>
            <th
              rowSpan={props.measures.length > 1 ? 2 : 1}
              className="sticky left-0 z-30 px-2.5 py-2 text-left font-semibold whitespace-nowrap border-b min-w-[220px]"
              style={{
                background: "#F3F8F9",
                borderColor: "var(--dt-border)",
              }}>
              {props.rowLabel}
            </th>
            {colLabels.map((l, i) => (
              <th
                key={colKeys[i]}
                colSpan={props.measures.length}
                className="px-2.5 py-1.5 text-center font-semibold whitespace-nowrap border-b border-l"
                style={{ borderColor: "var(--dt-border)" }}>
                {l}
              </th>
            ))}
          </tr>
          {props.measures.length > 1 && (
            <tr>
              {colKeys.map((k) =>
                props.measures.map((m) => (
                  <th
                    key={`${k}-${m.key}`}
                    className="px-2.5 py-1 text-right font-medium whitespace-nowrap border-b border-l text-[11.5px]"
                    style={{
                      borderColor: "var(--dt-border)",
                      color: "var(--dt-text-secondary)",
                    }}>
                    {m.label}
                  </th>
                )),
              )}
            </tr>
          )}
        </thead>
        <tbody>
          {data.rows.length === 0 && (
            <tr>
              <td
                colSpan={1 + colKeys.length * props.measures.length}
                className="p-6 text-center"
                style={{ color: "var(--dt-text-muted)" }}>
                Không có dữ liệu
              </td>
            </tr>
          )}
          <Rows
            {...props}
            data={data}
            path={[]}
            colKeys={colKeys}
            maxVal={maxVal}
          />
        </tbody>
        {data.total && (
          <tfoot className="sticky bottom-0 z-20">
            <tr style={{ background: "#F3F8F9" }}>
              <td
                className="sticky left-0 px-2.5 py-1.5 font-bold border-t"
                style={{
                  background: "#F3F8F9",
                  borderColor: "var(--dt-border)",
                }}>
                Tổng
              </td>
              <Cells
                cells={data.total}
                colKeys={colKeys}
                measures={props.measures}
                metric={metric}
                bold
              />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Rows(
  props: Props & {
    data: PivotResult;
    path: string[];
    colKeys: string[];
    maxVal: number;
  },
) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const level = props.path.length;
  const canExpand = level < props.rows.length - 1;
  return (
    <>
      {props.data.rows.map((r) => {
        const token = r.key ?? NULL_TOKEN;
        const isOpen = !!open[token];
        return (
          <Fragment key={token}>
            <tr
              className="border-b hover:bg-[#F7FBFC]"
              style={{ borderColor: "var(--dt-border)" }}>
              <td
                className="sticky left-0 bg-white px-2.5 py-1 whitespace-nowrap max-w-[360px] truncate"
                style={{ paddingLeft: 10 + level * 16 }}
                title={r.key ?? "(Trống)"}>
                {canExpand ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-medium hover:text-[var(--dt-primary)]"
                    onClick={() =>
                      setOpen((o) => ({ ...o, [token]: !isOpen }))
                    }>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    {r.key ?? "(Trống)"}
                  </button>
                ) : (
                  <span className={level === 0 ? "font-medium" : ""}>
                    {r.key ?? "(Trống)"}
                  </span>
                )}
              </td>
              <Cells
                cells={r}
                colKeys={props.colKeys}
                measures={props.measures}
                metric={props.data.metric}
                heatMax={props.heat && level === 0 ? props.maxVal : undefined}
              />
            </tr>
            {isOpen && <Children {...props} path={[...props.path, token]} />}
          </Fragment>
        );
      })}
    </>
  );
}

function Children(
  props: Props & { path: string[]; colKeys: string[]; maxVal: number },
) {
  const { data, isLoading, error } = useKdPivot(props.filters, {
    rows: props.rows,
    path: props.path,
    cols: props.cols ?? "month",
    growth: props.growth ?? "none",
    detail: props.detail,
  });
  const span = 1 + props.colKeys.length * props.measures.length;
  if (error || isLoading || !data)
    return (
      <tr>
        <td
          colSpan={span}
          className="px-3 py-1.5 text-[12px]"
          style={{
            paddingLeft: 26 + props.path.length * 16,
            color: error ? "#C0392B" : "var(--dt-text-muted)",
          }}>
          {error ? (error as Error).message : "Đang tải…"}
        </td>
      </tr>
    );
  return <Rows {...props} data={data} />;
}

function Cells({
  cells,
  colKeys,
  measures,
  metric,
  bold,
  heatMax,
}: {
  cells: PivotCells;
  colKeys: string[];
  measures: { key: PivotMeasure; label: string }[];
  metric: AnalyticsMetric;
  bold?: boolean;
  heatMax?: number;
}) {
  return (
    <>
      {colKeys.map((k) =>
        measures.map((m) => {
          const v = cells.v[k];
          let text = "";
          let color: string | undefined;
          let bg: string | undefined;
          if (m.key === "growth") {
            const g = cells.g[k];
            text = g === null || g === undefined ? "" : pct(g, 2);
            color = pbiGrowthColor(g);
          } else if (v) {
            const idx = m.key === "metric" ? IDX[metric] : IDX[m.key];
            text = full(v[idx]);
            if (heatMax && m.key === "metric" && k !== "T") {
              const a = Math.min(1, v[idx] / heatMax);
              bg = `rgba(0,183,204,${(a * 0.35).toFixed(3)})`;
            }
          }
          return (
            <td
              key={`${k}-${m.key}`}
              className={`px-2.5 py-1 text-right dt-mono whitespace-nowrap border-l ${bold ? "font-bold border-t" : ""}`}
              style={{
                color,
                background: bg,
                borderColor: "var(--dt-border)",
              }}>
              {text}
            </td>
          );
        }),
      )}
    </>
  );
}
