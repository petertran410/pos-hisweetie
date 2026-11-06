"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Bảng pivot (thay pivotTable của Power BI) cho Chuyển Kho / Thu Mua:
 *  - cột nhóm 2 tầng: nhóm cột (Kho / Tháng) › measure, thêm nhóm "Tổng";
 *  - dòng phẳng hoặc 2 cấp (nhóm có dòng tổng phụ, bấm để thu gọn);
 *  - dòng tổng cuối bảng, header dính khi cuộn.
 * Ô BLANK (null) để trống như Power BI.
 */
export interface PivotMeasure<C> {
  key: string;
  label: string;
  get: (cell: C | undefined) => number | null | undefined;
  format: (v: number | null | undefined) => string;
  color?: (v: number | null | undefined) => string | undefined;
}

export interface PivotColGroup {
  key: string;
  label: ReactNode;
}

export interface PivotLeaf<C> {
  key: string;
  labels: ReactNode[];
  cells: Record<string, C | undefined>;
  total: C;
}

export interface PivotGroup<C> {
  key: string;
  label: ReactNode;
  cells: Record<string, C | undefined>;
  total: C;
  children: PivotLeaf<C>[];
}

const HEAD_BG = "#F3F8F9";

/** Bảng không có nhóm cột: truyền colGroups = FLAT_COLS (chỉ 1 hàng tiêu đề measure). */
export const FLAT_COLS: PivotColGroup[] = [{ key: "__flat__", label: "" }];

export function MuaHangPivot<C>({
  rowHeaders,
  colGroups,
  measures,
  rows,
  groups,
  total,
  showTotalCol = true,
  totalColLabel = "Tổng",
  maxHeight = 620,
  empty = "Không có dữ liệu",
  defaultCollapsed = false,
  wideLabel,
}: {
  rowHeaders: string[];
  colGroups: PivotColGroup[];
  measures: PivotMeasure<C>[];
  rows?: PivotLeaf<C>[];
  groups?: PivotGroup<C>[];
  total?: { cells: Record<string, C | undefined>; total: C } | null;
  showTotalCol?: boolean;
  totalColLabel?: string;
  maxHeight?: number;
  empty?: string;
  defaultCollapsed?: boolean;
  /** Cột nhãn được giãn rộng (mặc định cột nhãn cuối). */
  wideLabel?: number;
}) {
  const wide = wideLabel ?? rowHeaders.length - 1;
  // Nhóm đã bấm đổi so với mặc định (mặc định mở, hoặc mặc định thu gọn).
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const isOpen = (k: string) =>
    defaultCollapsed ? toggled.has(k) : !toggled.has(k);
  const setAll = (open: boolean) =>
    setToggled(
      open === defaultCollapsed
        ? new Set(groups?.map((g) => g.key))
        : new Set(),
    );
  const cols = useMemo(
    () => [
      ...colGroups,
      ...(showTotalCol && colGroups.length !== 1
        ? [{ key: "__total__", label: totalColLabel }]
        : []),
    ],
    [colGroups, showTotalCol, totalColLabel],
  );
  const flat = colGroups.length === 1 && colGroups[0].key === "__flat__";
  const singleMeasure = measures.length === 1;
  const twoRows = !flat && !singleMeasure;
  const isEmpty = !(rows?.length || groups?.length);

  const valueCells = (
    cells: Record<string, C | undefined>,
    tot: C,
    bold = false,
  ) =>
    cols.map((cg, ci) =>
      measures.map((m, mi) => {
        const c =
          cg.key === "__total__" || cg.key === "__flat__" ? tot : cells[cg.key];
        const v = m.get(c);
        return (
          <td
            key={`${cg.key}-${m.key}`}
            className={`px-2.5 py-1.5 text-right dt-mono whitespace-nowrap ${bold ? "font-semibold" : ""} ${
              mi === 0 && ci > 0 ? "border-l" : ""
            } ${cg.key === "__total__" ? "bg-[#F9FCFC]" : ""}`}
            style={{ color: m.color?.(v), borderColor: "var(--dt-border)" }}>
            {m.format(v)}
          </td>
        );
      }),
    );

  const toggle = (k: string) =>
    setToggled((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div className="space-y-1.5">
      {groups && groups.length > 1 && (
        <div className="flex justify-end gap-3 text-[12px]">
          <button
            type="button"
            className="text-[var(--dt-primary)] hover:underline"
            onClick={() => setAll(true)}>
            Mở rộng tất cả
          </button>
          <button
            type="button"
            className="text-[var(--dt-primary)] hover:underline"
            onClick={() => setAll(false)}>
            Thu gọn tất cả
          </button>
        </div>
      )}
      <div
        className="border rounded-lg overflow-auto"
        style={{ maxHeight, borderColor: "var(--dt-border)" }}>
        <table className="w-full text-[12.5px] border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: HEAD_BG }}>
            <tr>
              {rowHeaders.map((h, i) => (
                <th
                  key={h}
                  rowSpan={twoRows ? 2 : 1}
                  className={`px-2.5 py-2 text-left font-semibold text-[12px] whitespace-nowrap border-b ${
                    i === 0 ? "sticky left-0 z-20" : ""
                  }`}
                  style={{
                    background: HEAD_BG,
                    color: "var(--dt-text-secondary)",
                    borderColor: "var(--dt-border)",
                  }}>
                  {h}
                </th>
              ))}
              {flat &&
                measures.map((m) => (
                  <th
                    key={m.key}
                    className="px-2.5 py-2 text-right font-semibold text-[12px] whitespace-nowrap border-b"
                    style={{
                      background: HEAD_BG,
                      color: "var(--dt-text-secondary)",
                      borderColor: "var(--dt-border)",
                    }}>
                    {m.label}
                  </th>
                ))}
              {!flat &&
                cols.map((cg, ci) => (
                  <th
                    key={cg.key}
                    colSpan={measures.length}
                    className={`px-2.5 py-2 text-center font-semibold text-[12px] whitespace-nowrap border-b ${
                      ci > 0 ? "border-l" : ""
                    }`}
                    style={{
                      background: HEAD_BG,
                      color: "var(--dt-text-secondary)",
                      borderColor: "var(--dt-border)",
                    }}>
                    {cg.label}
                  </th>
                ))}
            </tr>
            {twoRows && (
              <tr>
                {cols.map((cg, ci) =>
                  measures.map((m, mi) => (
                    <th
                      key={`${cg.key}-${m.key}`}
                      className={`px-2.5 py-1.5 text-right font-medium text-[11.5px] whitespace-nowrap border-b ${
                        mi === 0 && ci > 0 ? "border-l" : ""
                      }`}
                      style={{
                        background: HEAD_BG,
                        color: "var(--dt-text-muted)",
                        borderColor: "var(--dt-border)",
                      }}>
                      {m.label}
                    </th>
                  )),
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {isEmpty && (
              <tr>
                <td
                  colSpan={rowHeaders.length + cols.length * measures.length}
                  className="p-6 text-center"
                  style={{ color: "var(--dt-text-muted)" }}>
                  {empty}
                </td>
              </tr>
            )}
            {groups?.map((g) => {
              const open = isOpen(g.key);
              return (
                <Fragment key={g.key}>
                  <tr
                    className="border-b cursor-pointer hover:bg-[#F2F9FA]"
                    style={{
                      borderColor: "var(--dt-border)",
                      background: "#F7FBFC",
                    }}
                    onClick={() => toggle(g.key)}>
                    <td
                      colSpan={rowHeaders.length}
                      className="px-2.5 py-1.5 font-semibold sticky left-0 whitespace-nowrap"
                      style={{ background: "#F7FBFC" }}>
                      <span className="inline-flex items-center gap-1">
                        {open ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        {g.label}
                      </span>
                    </td>
                    {valueCells(g.cells, g.total, true)}
                  </tr>
                  {open &&
                    g.children.map((r) => (
                      <tr
                        key={`${g.key}-${r.key}`}
                        className="border-b hover:bg-[#F7FBFC]"
                        style={{ borderColor: "var(--dt-border)" }}>
                        {r.labels.map((l, i) => (
                          <td
                            key={i}
                            className={`px-2.5 py-1.5 ${i === 0 ? "sticky left-0 bg-white pl-7" : ""} ${
                              i === wide ? "min-w-[220px]" : "whitespace-nowrap"
                            }`}>
                            {l}
                          </td>
                        ))}
                        {valueCells(r.cells, r.total)}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
            {rows?.map((r) => (
              <tr
                key={r.key}
                className="border-b hover:bg-[#F7FBFC]"
                style={{ borderColor: "var(--dt-border)" }}>
                {r.labels.map((l, i) => (
                  <td
                    key={i}
                    className={`px-2.5 py-1.5 ${i === 0 ? "sticky left-0 bg-white" : ""} ${
                      i === wide ? "min-w-[220px]" : "whitespace-nowrap"
                    }`}>
                    {l}
                  </td>
                ))}
                {valueCells(r.cells, r.total)}
              </tr>
            ))}
          </tbody>
          {total && !isEmpty && (
            <tfoot className="sticky bottom-0" style={{ background: HEAD_BG }}>
              <tr>
                <td
                  colSpan={rowHeaders.length}
                  className="px-2.5 py-2 font-bold border-t sticky left-0"
                  style={{
                    background: HEAD_BG,
                    borderColor: "var(--dt-border)",
                  }}>
                  Tổng
                </td>
                {cols.map((cg, ci) =>
                  measures.map((m, mi) => {
                    const c =
                      cg.key === "__total__" || cg.key === "__flat__"
                        ? total.total
                        : total.cells[cg.key];
                    const v = m.get(c);
                    return (
                      <td
                        key={`${cg.key}-${m.key}`}
                        className={`px-2.5 py-2 text-right dt-mono font-bold border-t whitespace-nowrap ${
                          mi === 0 && ci > 0 ? "border-l" : ""
                        }`}
                        style={{
                          background: HEAD_BG,
                          borderColor: "var(--dt-border)",
                          color: m.color?.(v),
                        }}>
                        {m.format(v)}
                      </td>
                    );
                  }),
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
