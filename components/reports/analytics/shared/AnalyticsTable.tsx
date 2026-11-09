"use client";

import type { ReactNode } from "react";

/**
 * Bảng số liệu dùng chung (thay pivotTable / tableEx của Power BI).
 * - columns: định nghĩa cột; format(v, row) trả về chuỗi / ReactNode.
 * - totals: dòng tổng (tuỳ chọn), hiển thị đậm ở cuối.
 * - color(v, row): màu chữ theo giá trị (định dạng có điều kiện của Power BI).
 * Header dính khi cuộn; cột đầu dính khi cuộn ngang.
 */
export interface AnalyticsColumn<T> {
  key: string;
  label: ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  value?: (row: T) => unknown;
  format?: (v: unknown, row: T) => ReactNode;
  color?: (v: unknown, row: T) => string | undefined;
  background?: (v: unknown, row: T) => string | undefined;
}

export function AnalyticsTable<T>({
  columns,
  rows,
  totals,
  rowKey,
  maxHeight = 520,
  empty = "Không có dữ liệu",
}: {
  columns: AnalyticsColumn<T>[];
  rows: T[];
  totals?: T | null;
  rowKey?: (row: T, i: number) => string | number;
  maxHeight?: number;
  empty?: string;
}) {
  const cell = (c: AnalyticsColumn<T>, row: T) => {
    const v = c.value ? c.value(row) : (row as Record<string, unknown>)[c.key];
    return {
      content: c.format
        ? c.format(v, row)
        : v === null || v === undefined
          ? ""
          : String(v),
      color: c.color?.(v, row),
      background: c.background?.(v, row),
    };
  };
  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div
      className="border rounded-lg overflow-auto"
      style={{ maxHeight, borderColor: "var(--dt-border)" }}>
      <table className="w-full text-[12.5px] border-collapse">
        <thead className="sticky top-0 z-10" style={{ background: "#F3F8F9" }}>
          <tr>
            {columns.map((c, i) => (
              <th
                key={c.key}
                className={`px-2.5 py-2 font-semibold text-[12px] whitespace-nowrap border-b ${alignCls(c.align)} ${
                  i === 0 ? "sticky left-0 z-20" : ""
                }`}
                style={{
                  width: c.width,
                  background: "#F3F8F9",
                  color: "var(--dt-text-secondary)",
                  borderColor: "var(--dt-border)",
                }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="p-6 text-center"
                style={{ color: "var(--dt-text-muted)" }}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, ri) => (
            <tr
              key={rowKey ? rowKey(row, ri) : ri}
              className="border-b hover:bg-[#F7FBFC]"
              style={{ borderColor: "var(--dt-border)" }}>
              {columns.map((c, i) => {
                const x = cell(c, row);
                return (
                  <td
                    key={c.key}
                    className={`px-2.5 py-1.5 ${alignCls(c.align)} ${c.align === "right" ? "dt-mono" : ""} ${
                      i === 0 ? "sticky left-0 bg-white" : ""
                    }`}
                    style={{ color: x.color, background: x.background }}>
                    {x.content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot className="sticky bottom-0" style={{ background: "#F3F8F9" }}>
            <tr>
              {columns.map((c, i) => {
                const x = cell(c, totals);
                return (
                  <td
                    key={c.key}
                    className={`px-2.5 py-2 font-bold border-t ${alignCls(c.align)} ${c.align === "right" ? "dt-mono" : ""} ${
                      i === 0 ? "sticky left-0" : ""
                    }`}
                    style={{
                      background: "#F3F8F9",
                      borderColor: "var(--dt-border)",
                      color: x.color,
                    }}>
                    {i === 0 && !x.content ? "Tổng" : x.content}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
