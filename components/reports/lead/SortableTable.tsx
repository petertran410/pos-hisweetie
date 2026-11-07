"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface SortColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Giá trị dùng để sắp xếp. */
  sortValue: (row: T) => number | string;
  render: (row: T) => ReactNode;
  /** Gợi ý khi rê chuột vào tiêu đề. */
  hint?: string;
}

type Dir = "asc" | "desc";

/** Bảng nhỏ sắp xếp được theo cột (bấm tiêu đề; bấm lại để đảo chiều). */
export function SortableTable<T>({
  columns,
  rows,
  rowKey,
  defaultSort,
  caption,
}: {
  columns: SortColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  defaultSort: { key: string; dir: Dir };
  caption: string;
}) {
  const [sort, setSort] = useState(defaultSort);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const m = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = col.sortValue(a);
      const y = col.sortValue(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * m;
      return String(x).localeCompare(String(y), "vi") * m;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string, align?: "left" | "right") =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: align === "right" ? "desc" : "asc" },
    );

  return (
    <div className="overflow-x-auto -mx-1">
      {/* aria-label thay <caption className="sr-only">: caption absolute không có khung relative
          làm tài liệu cao thêm → cả trang cuộn được và lộ khoảng trắng dưới layout. */}
      <table aria-label={caption} className="w-full text-[13px] border-collapse">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--dt-border)" }}>
            {columns.map((c) => {
              const on = sort.key === c.key;
              const Icon = !on ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={`px-2 py-2 font-semibold text-[12px] whitespace-nowrap ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                  style={{ color: "var(--dt-text-secondary)" }}>
                  <button
                    type="button"
                    title={c.hint}
                    onClick={() => toggle(c.key, c.align)}
                    className={`inline-flex items-center gap-1 hover:text-[var(--dt-primary)] ${
                      c.align === "right" ? "flex-row-reverse" : ""
                    }`}
                    style={on ? { color: "var(--dt-primary-deep)" } : undefined}>
                    {c.header}
                    <Icon
                      className="w-3 h-3"
                      style={{ opacity: on ? 1 : 0.4 }}
                      aria-hidden
                    />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              className="dt-row"
              style={{ borderBottom: "1px solid var(--dt-border)" }}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-2 py-[9px] ${c.align === "right" ? "text-right" : "text-left"}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
