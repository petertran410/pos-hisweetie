"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { AnalyticsMetric } from "@/lib/api/analytics-reports";
import type {
  Pivot,
  PivotMeasure,
  PivotNode,
} from "@/lib/api/analytics-khach-hang-dlcl";
import { BLANK_LABEL } from "../analyticsFormat";
import { measureLabel, measureText, momColor } from "./dlclFormat";

/**
 * Bảng matrix nhiều cấp (thay pivotTable của Power BI):
 *  - hàng cấp 1 → cấp 2 (bấm để mở rộng; hàng con có thể tải khi mở — onExpand),
 *  - cột theo tháng / tuần / năm-tháng (nhóm cột theo `group`), mỗi cột nhiều measure,
 *  - cột MoM tô màu như "Color for MoM Growth (%)", dòng Tổng ở cuối.
 */
export function DlclPivotTable({
  pivot,
  rowHeader,
  metric,
  labels,
  onExpand,
  maxHeight = 560,
  pageSize = 100,
  heat = false,
}: {
  pivot: Pivot;
  rowHeader: string;
  metric: AnalyticsMetric;
  /** Đổi tên measure (mặc định theo measureLabel). */
  labels?: Partial<Record<PivotMeasure, string>>;
  onExpand?: (label: string) => Promise<PivotNode[]>;
  maxHeight?: number;
  pageSize?: number;
  /** Tô nền theo độ lớn trong từng cột (định dạng có điều kiện của Power BI). */
  heat?: boolean;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState<Map<number, PivotNode[]>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());
  const [shown, setShown] = useState(pageSize);
  const [failed, setFailed] = useState<string | null>(null);

  const { columns, measures, rows, total } = pivot;
  const multi = measures.length > 1;
  const hasGroups = columns.some((c) => c.group);
  const groups = useMemo(() => {
    const out: { label: string; span: number }[] = [];
    for (const c of columns) {
      const g = c.group ?? "";
      const last = out[out.length - 1];
      if (last && last.label === g) last.span += 1;
      else out.push({ label: g, span: 1 });
    }
    return out;
  }, [columns]);
  const canExpandAll = rows.some((r) => r.children?.length);
  const allOpen = canExpandAll && open.size === rows.length;

  // Giá trị lớn nhất của từng cột (theo hàng chi tiết nhất) để tô nền.
  const colMax = useMemo(() => {
    if (!heat) return [];
    const max = columns.map(() => 0);
    const scan = (list: PivotNode[]) =>
      list.forEach((n) => {
        if (n.children?.length) scan(n.children);
        else
          n.cells.forEach(
            (c, ci) => (max[ci] = Math.max(max[ci], c?.[0] ?? 0)),
          );
      });
    scan(rows);
    return max;
  }, [heat, columns, rows]);
  const heatBg = (ci: number, v: number | null) =>
    heat && v && colMax[ci] > 0
      ? `rgba(0, 183, 204, ${(0.06 + 0.42 * Math.min(1, v / colMax[ci])).toFixed(3)})`
      : undefined;

  const mLabel = (m: PivotMeasure) => labels?.[m] ?? measureLabel(m, metric);
  const toggle = async (i: number, node: PivotNode) => {
    const next = new Set(open);
    if (next.has(i)) {
      next.delete(i);
      setOpen(next);
      return;
    }
    next.add(i);
    setOpen(next);
    if (
      !node.children &&
      node.expandable &&
      onExpand &&
      !loaded.has(i) &&
      node.label !== null
    ) {
      setLoading((s) => new Set(s).add(i));
      try {
        const children = await onExpand(node.label);
        setLoaded((m) => new Map(m).set(i, children));
        setFailed(null);
      } catch (e) {
        setFailed((e as Error).message);
        setOpen((s) => {
          const n = new Set(s);
          n.delete(i);
          return n;
        });
      } finally {
        setLoading((s) => {
          const n = new Set(s);
          n.delete(i);
          return n;
        });
      }
    }
  };

  const cells = (cellsOf: (number | null)[][], bold = false) =>
    columns.map((c, ci) =>
      measures.map((m, mi) => {
        const v = cellsOf[ci]?.[mi] ?? null;
        return (
          <td
            key={`${c.key}-${m}`}
            className={`px-2.5 py-1.5 text-right dt-mono whitespace-nowrap ${bold ? "font-semibold" : ""} ${
              mi === 0 ? "border-l" : ""
            }`}
            style={{
              borderColor: "var(--dt-border)",
              color: m === "mom" ? momColor(v) : undefined,
              background: !bold && mi === 0 ? heatBg(ci, v) : undefined,
            }}>
            {measureText(m, v)}
          </td>
        );
      }),
    );

  const headCls =
    "px-2.5 py-2 font-semibold text-[12px] whitespace-nowrap border-b";
  const headStyle = {
    background: "#F3F8F9",
    color: "var(--dt-text-secondary)",
    borderColor: "var(--dt-border)",
  };
  const headRows = (hasGroups ? 1 : 0) + 1 + (multi ? 1 : 0);

  return (
    <div className="space-y-2">
      {(canExpandAll || failed) && (
        <div className="flex items-center gap-3 text-[12.5px]">
          {canExpandAll && (
            <button
              type="button"
              className="font-medium text-[var(--dt-primary)] hover:underline"
              onClick={() =>
                setOpen(allOpen ? new Set() : new Set(rows.map((_, i) => i)))
              }>
              {allOpen ? "Thu gọn tất cả" : "Mở rộng tất cả"}
            </button>
          )}
          {failed && (
            <span className="text-red-600">Không tải được: {failed}</span>
          )}
        </div>
      )}
      <div
        className="border rounded-lg overflow-auto"
        style={{ maxHeight, borderColor: "var(--dt-border)" }}>
        <table className="w-full text-[12.5px] border-collapse">
          <thead className="sticky top-0 z-10">
            {hasGroups && (
              <tr>
                <th
                  rowSpan={headRows}
                  className={`${headCls} text-left sticky left-0 z-20 min-w-[220px]`}
                  style={headStyle}>
                  {rowHeader}
                </th>
                {groups.map((g, i) => (
                  <th
                    key={i}
                    colSpan={g.span * measures.length}
                    className={`${headCls} text-center border-l`}
                    style={headStyle}>
                    {g.label}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {!hasGroups && (
                <th
                  rowSpan={headRows}
                  className={`${headCls} text-left sticky left-0 z-20 min-w-[220px]`}
                  style={headStyle}>
                  {rowHeader}
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  colSpan={measures.length}
                  rowSpan={!multi && !hasGroups ? 1 : undefined}
                  className={`${headCls} ${multi ? "text-center" : "text-right"} border-l`}
                  style={headStyle}>
                  {c.label ?? BLANK_LABEL}
                </th>
              ))}
            </tr>
            {multi && (
              <tr>
                {columns.map((c) =>
                  measures.map((m, mi) => (
                    <th
                      key={`${c.key}-${m}`}
                      className={`${headCls} text-right font-medium ${mi === 0 ? "border-l" : ""}`}
                      style={headStyle}>
                      {mLabel(m)}
                    </th>
                  )),
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={1 + columns.length * measures.length}
                  className="p-6 text-center"
                  style={{ color: "var(--dt-text-muted)" }}>
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {rows.slice(0, shown).map((r, i) => {
              const children = r.children ?? loaded.get(i);
              const expandable = !!r.children?.length || !!r.expandable;
              const isOpen = open.has(i);
              return (
                <Fragment key={i}>
                  <tr
                    className="border-b hover:bg-[#F7FBFC]"
                    style={{ borderColor: "var(--dt-border)" }}>
                    <td className="px-2.5 py-1.5 sticky left-0 bg-white font-semibold">
                      <div className="flex items-center gap-1 min-w-0">
                        {expandable ? (
                          <button
                            type="button"
                            onClick={() => toggle(i, r)}
                            className="p-0.5 rounded hover:bg-gray-100 shrink-0"
                            aria-label={isOpen ? "Thu gọn" : "Mở rộng"}>
                            {loading.has(i) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="w-[18px] shrink-0" />
                        )}
                        <span
                          className="truncate max-w-[320px]"
                          title={r.label ?? BLANK_LABEL}>
                          {r.label ?? BLANK_LABEL}
                        </span>
                      </div>
                    </td>
                    {cells(r.cells, true)}
                  </tr>
                  {isOpen &&
                    children?.map((c, j) => (
                      <tr
                        key={`${i}-${j}`}
                        className="border-b hover:bg-[#F7FBFC]"
                        style={{ borderColor: "var(--dt-border)" }}>
                        <td className="pl-9 pr-2.5 py-1.5 sticky left-0 bg-white">
                          <span
                            className="block truncate max-w-[320px]"
                            title={c.label ?? BLANK_LABEL}>
                            {c.label ?? BLANK_LABEL}
                          </span>
                        </td>
                        {cells(c.cells)}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot
              className="sticky bottom-0"
              style={{ background: "#F3F8F9" }}>
              <tr>
                <td
                  className="px-2.5 py-2 font-bold border-t sticky left-0"
                  style={{
                    background: "#F3F8F9",
                    borderColor: "var(--dt-border)",
                  }}>
                  Tổng
                </td>
                {columns.map((c, ci) =>
                  measures.map((m, mi) => {
                    const v = total[ci]?.[mi] ?? null;
                    return (
                      <td
                        key={`${c.key}-${m}`}
                        className={`px-2.5 py-2 text-right dt-mono font-bold border-t whitespace-nowrap ${mi === 0 ? "border-l" : ""}`}
                        style={{
                          background: "#F3F8F9",
                          borderColor: "var(--dt-border)",
                          color: m === "mom" ? momColor(v) : undefined,
                        }}>
                        {measureText(m, v)}
                      </td>
                    );
                  }),
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {rows.length > shown && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + pageSize)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg border hover:bg-gray-50"
            style={{ borderColor: "var(--dt-border)" }}>
            Xem thêm ({rows.length - shown} dòng còn lại)
          </button>
        </div>
      )}
    </div>
  );
}
