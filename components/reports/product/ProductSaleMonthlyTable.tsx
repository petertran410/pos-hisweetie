"use client";

import { Fragment, useMemo } from "react";
import { ProductChartRow } from "@/lib/api/reports";
import { formatCurrency, formatNumber } from "@/lib/utils";

// Bảng pivot "Bán theo sản phẩm": dòng = Nhóm hàng → Tên hàng,
// cột = Năm → Tháng → (Tổng tiền hàng, Số lượng bán), kèm Tổng năm và Tổng chung.

type Cell = { quantity: number; value: number };
type Cells = Record<string, Cell>;

interface Props {
  rows: ProductChartRow[];
  months: string[]; // "YYYY-MM", đã sắp xếp
  onSelectSubject?: (row: ProductChartRow) => void;
}

// Độ rộng 2 cột cố định bên trái (px) — cột 2 dính ngay sau cột 1.
const GROUP_COL_W = 160;
const NAME_COL_W = 280;

const EMPTY: Cell = { quantity: 0, value: 0 };

function addInto(target: Cells, source: Cells | undefined) {
  if (!source) return;
  for (const [m, c] of Object.entries(source)) {
    const t = target[m] || { quantity: 0, value: 0 };
    t.quantity += c.quantity || 0;
    t.value += c.value || 0;
    target[m] = t;
  }
}

function sumMonths(cells: Cells, months: string[]): Cell {
  return months.reduce(
    (acc, m) => {
      acc.quantity += cells[m]?.quantity || 0;
      acc.value += cells[m]?.value || 0;
      return acc;
    },
    { quantity: 0, value: 0 }
  );
}

export function ProductSaleMonthlyTable({
  rows,
  months,
  onSelectSubject,
}: Props) {
  const years = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of months) {
      const y = m.slice(0, 4);
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(m);
    }
    return Array.from(map, ([year, ms]) => ({ year, months: ms }));
  }, [months]);

  const { groups, grand } = useMemo(() => {
    const map = new Map<string, { rows: ProductChartRow[]; cells: Cells }>();
    const grandCells: Cells = {};
    for (const r of rows) {
      const name = r.group || "Chưa phân nhóm";
      if (!map.has(name)) map.set(name, { rows: [], cells: {} });
      const g = map.get(name)!;
      g.rows.push(r);
      addInto(g.cells, r.byMonth);
      addInto(grandCells, r.byMonth);
    }
    const list = Array.from(map, ([name, g]) => ({
      name,
      rows: [...g.rows].sort((a, b) => (b.value || 0) - (a.value || 0)),
      cells: g.cells,
      total: sumMonths(g.cells, months),
    })).sort((a, b) => b.total.value - a.total.value);
    return { groups: list, grand: grandCells };
  }, [rows, months]);

  // Các ô số của 1 dòng: từng tháng + Tổng năm, lặp theo năm, rồi Tổng chung.
  const renderCells = (cells: Cells, tone: "row" | "subtotal" | "grand") => {
    const qtyCls =
      tone === "row" ? "text-gray-700" : "text-gray-900 font-semibold";
    const valCls =
      tone === "row"
        ? "text-gray-900"
        : tone === "grand"
          ? "text-brand-dark font-semibold"
          : "text-gray-900 font-semibold";
    const cellPair = (key: string, c: Cell, emphasize = false) => (
      <Fragment key={key}>
        <td
          className={`px-3 py-2 text-right whitespace-nowrap border-b border-r border-gray-100 ${valCls} ${
            emphasize ? "bg-sky-50/60" : ""
          } ${c.value === 0 && tone === "row" ? "!text-gray-300" : ""}`}>
          {formatCurrency(c.value)}
        </td>
        <td
          className={`px-3 py-2 text-right whitespace-nowrap border-b border-r border-gray-100 ${qtyCls} ${
            emphasize ? "bg-sky-50/60" : ""
          } ${c.quantity === 0 && tone === "row" ? "!text-gray-300" : ""}`}>
          {formatNumber(c.quantity)}
        </td>
      </Fragment>
    );
    return (
      <>
        {years.map((y) => (
          <Fragment key={y.year}>
            {y.months.map((m) => cellPair(m, cells[m] || EMPTY))}
            {cellPair(`${y.year}-total`, sumMonths(cells, y.months), true)}
          </Fragment>
        ))}
        {cellPair("grand-total", sumMonths(cells, months), true)}
      </>
    );
  };

  const th =
    "px-3 py-2 font-semibold text-gray-700 whitespace-nowrap border-b border-r border-sky-200 bg-sky-100";
  const metricHeaders = (key: string) => (
    <Fragment key={key}>
      <th className={`${th} text-right`}>Tổng Tiền Hàng</th>
      <th className={`${th} text-right`}>Số Lượng Bán</th>
    </Fragment>
  );

  const stickyGroup = {
    left: 0,
    width: GROUP_COL_W,
    minWidth: GROUP_COL_W,
    maxWidth: GROUP_COL_W,
  };
  const stickyName = {
    left: GROUP_COL_W,
    width: NAME_COL_W,
    minWidth: NAME_COL_W,
    maxWidth: NAME_COL_W,
  };
  const stickyLead = { left: 0, minWidth: GROUP_COL_W + NAME_COL_W };

  return (
    <table className="min-w-full text-sm border-separate border-spacing-0">
      <thead className="sticky top-0 z-20">
        <tr>
          <th
            rowSpan={3}
            style={stickyGroup}
            className={`${th} sticky z-30 text-left align-bottom`}>
            Nhóm Hàng
          </th>
          <th
            rowSpan={3}
            style={stickyName}
            className={`${th} sticky z-30 text-left align-bottom`}>
            Tên Hàng
          </th>
          {years.map((y) => (
            <th
              key={y.year}
              colSpan={(y.months.length + 1) * 2}
              className={`${th} text-center`}>
              {y.year}
            </th>
          ))}
          <th rowSpan={2} colSpan={2} className={`${th} text-center`}>
            Tổng
          </th>
        </tr>
        <tr>
          {years.map((y) => (
            <Fragment key={y.year}>
              {y.months.map((m) => (
                <th key={m} colSpan={2} className={`${th} text-center`}>
                  Tháng {Number(m.slice(5, 7))}
                </th>
              ))}
              <th colSpan={2} className={`${th} text-center`}>
                Tổng {y.year}
              </th>
            </Fragment>
          ))}
        </tr>
        <tr>
          {years.map((y) => (
            <Fragment key={y.year}>
              {y.months.map((m) => metricHeaders(m))}
              {metricHeaders(`${y.year}-total`)}
            </Fragment>
          ))}
          {metricHeaders("grand-total")}
        </tr>
      </thead>
      <tbody>
        <tr className="bg-amber-50">
          <td
            colSpan={2}
            style={stickyLead}
            className="sticky z-10 px-3 py-2 font-semibold text-gray-800 bg-amber-50 border-b border-r border-gray-200">
            Tổng cộng
          </td>
          {renderCells(grand, "grand")}
        </tr>
        {groups.map((g) => (
          <Fragment key={g.name}>
            {g.rows.map((row, idx) => (
              <tr
                key={`${row.extra1 ?? ""}|${row.subject}`}
                className="group hover:bg-gray-50">
                {idx === 0 && (
                  <td
                    rowSpan={g.rows.length}
                    style={stickyGroup}
                    className="sticky z-10 px-3 py-2 align-top font-medium text-gray-800 bg-white border-b border-r border-gray-200">
                    {g.name}
                  </td>
                )}
                <td
                  style={stickyName}
                  className="sticky z-10 px-3 py-2 bg-white group-hover:bg-gray-50 border-b border-r border-gray-200">
                  {onSelectSubject ? (
                    <button
                      type="button"
                      onClick={() => onSelectSubject(row)}
                      className="text-brand hover:underline font-medium text-left">
                      {row.subject}
                    </button>
                  ) : (
                    <span className="text-gray-900">{row.subject}</span>
                  )}
                </td>
                {renderCells(row.byMonth || {}, "row")}
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td
                colSpan={2}
                style={stickyLead}
                className="sticky z-10 px-3 py-2 font-semibold text-gray-800 bg-gray-50 border-b border-r border-gray-200">
                Tổng {g.name}
              </td>
              {renderCells(g.cells, "subtotal")}
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
