"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Ma trận kiểu pivotTable Power BI: hàng 2 cấp (cấp 1 có thể mở ra cấp 2),
 * cột chia nhóm (vd theo nhân viên) × các giá trị (KPI / Thực tế / %).
 * Số đã tính sẵn ở `cells[group][measure]`; dòng cấp 1 là dòng tổng của cấp 2.
 */
export interface MatrixMeasure {
  key: string;
  label: string;
  format: (v: number | null) => string;
  color?: (v: number | null) => string | undefined;
}

export interface MatrixRow {
  key: string;
  label: string;
  cells: Record<string, Record<string, number | null>>;
  children?: MatrixRow[];
}

export function KpiMatrix({
  rowHeader,
  groups,
  measures,
  rows,
  total,
  totalLabel = "Tổng",
  defaultExpanded = false,
  maxHeight = 560,
  empty = "Không có dữ liệu",
}: {
  rowHeader: string;
  /** Nhóm cột; để rỗng nếu chỉ có 1 nhóm (khi đó dùng key ""). */
  groups: { key: string; label: string }[];
  measures: MatrixMeasure[];
  rows: MatrixRow[];
  total?: MatrixRow | null;
  totalLabel?: string;
  defaultExpanded?: boolean;
  maxHeight?: number;
  empty?: string;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (k: string) => open[k] ?? defaultExpanded;
  const cols = groups.length ? groups : [{ key: "", label: "" }];
  const twoHeader = groups.length > 0;
  const border = { borderColor: "var(--dt-border)" };

  const valueCells = (r: MatrixRow, bold = false) =>
    cols.map((g, gi) =>
      measures.map((m, mi) => {
        const v = r.cells[g.key]?.[m.key] ?? null;
        return (
          <td
            key={`${g.key}|${m.key}`}
            className={`px-2.5 py-1.5 text-right dt-mono whitespace-nowrap ${bold ? "font-bold" : ""} ${
              mi === 0 && gi > 0 ? "border-l" : ""
            }`}
            style={{ ...border, color: m.color?.(v) }}>
            {m.format(v)}
          </td>
        );
      }),
    );

  return (
    <div
      className="border rounded-lg overflow-auto"
      style={{ maxHeight, ...border }}>
      <table className="w-full text-[12.5px] border-collapse">
        <thead className="sticky top-0 z-10" style={{ background: "#CBDCEB" }}>
          {twoHeader && (
            <tr>
              <th
                rowSpan={2}
                className="px-2.5 py-2 text-left font-semibold text-[12px] sticky left-0 z-20 border-b"
                style={{ background: "#CBDCEB", ...border }}>
                {rowHeader}
              </th>
              {cols.map((g, gi) => (
                <th
                  key={g.key}
                  colSpan={measures.length}
                  className={`px-2.5 py-1.5 text-center font-semibold text-[12px] whitespace-nowrap ${gi > 0 ? "border-l" : ""}`}
                  style={border}>
                  {g.label}
                </th>
              ))}
            </tr>
          )}
          <tr>
            {!twoHeader && (
              <th
                className="px-2.5 py-2 text-left font-semibold text-[12px] sticky left-0 z-20 border-b"
                style={{ background: "#CBDCEB", ...border }}>
                {rowHeader}
              </th>
            )}
            {cols.map((g, gi) =>
              measures.map((m, mi) => (
                <th
                  key={`${g.key}|${m.key}`}
                  className={`px-2.5 py-1.5 text-center font-semibold text-[12px] whitespace-nowrap border-b ${
                    mi === 0 && gi > 0 ? "border-l" : ""
                  }`}
                  style={border}>
                  {m.label}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={1 + cols.length * measures.length}
                className="p-6 text-center"
                style={{ color: "var(--dt-text-muted)" }}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const expandable = !!r.children?.length;
            const on = expandable && isOpen(r.key);
            return (
              <Fragment key={r.key}>
                <tr className="border-b hover:bg-[#F7FBFC]" style={border}>
                  <td
                    className="px-2.5 py-1.5 sticky left-0 bg-white whitespace-nowrap font-medium"
                    style={border}>
                    {expandable ? (
                      <button
                        type="button"
                        onClick={() => setOpen((o) => ({ ...o, [r.key]: !on }))}
                        className="inline-flex items-center gap-1 hover:text-[var(--dt-primary)]">
                        {on ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        {r.label}
                      </button>
                    ) : (
                      r.label
                    )}
                  </td>
                  {valueCells(r, on)}
                </tr>
                {on &&
                  r.children!.map((c) => (
                    <tr
                      key={`${r.key}|${c.key}`}
                      className="border-b hover:bg-[#F7FBFC]"
                      style={border}>
                      <td
                        className="pl-8 pr-2.5 py-1.5 sticky left-0 bg-white whitespace-nowrap"
                        style={border}>
                        {c.label}
                      </td>
                      {valueCells(c)}
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
        {total && rows.length > 0 && (
          <tfoot className="sticky bottom-0" style={{ background: "#F3F8F9" }}>
            <tr>
              <td
                className="px-2.5 py-2 font-bold sticky left-0 border-t"
                style={{ background: "#F3F8F9", ...border }}>
                {totalLabel}
              </td>
              {valueCells(total, true)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
