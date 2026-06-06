"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TaskRow } from "@/lib/api/dashboard";
import { money, vi, DT_COLORS } from "@/lib/dashboard/format";
import { ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type TaskType = "orders" | "debt" | "cod" | "stock";

interface TabDef {
  key: TaskType;
  label: string;
  roles: string[];
}

interface Props {
  tabs: TabDef[];
  active: TaskType;
  onTabChange: (t: TaskType) => void;
  rows: TaskRow[];
  counts: Record<string, number>;
  loading?: boolean;
  orderStatus?: string;
  onOrderStatusChange?: (s: string) => void;
}

/** Các trạng thái đơn cho bộ lọc tab "Đơn cần xử lý". */
export const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "pending", label: "Phiếu tạm" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "partially_invoiced", label: "Đã ra 1 phần HĐ" },
  { value: "completed", label: "Hoàn thành" },
];

function timeText(r: TaskRow, type: TaskType): string {
  if (type === "debt") {
    const a = r.ageDays ?? 0;
    if (a > 0) return `Trễ ${a}n`;
    if (a === 0) return "Hôm nay";
    return `Còn ${-a}n`;
  }
  if (r.time) {
    const d = new Date(r.time);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    }
  }
  return "—";
}

function statusChip(r: TaskRow, type: TaskType) {
  let cls = "info";
  let label = r.status;
  if (type === "debt") {
    cls = r.status === "overdue" ? "err" : r.status === "due" ? "warn" : "info";
    label =
      r.status === "overdue"
        ? "Quá hạn"
        : r.status === "due"
          ? "Đến hạn"
          : "Trong hạn";
  } else if (type === "stock") {
    cls = r.status === "negative" ? "err" : r.status === "out" ? "err" : "warn";
    label =
      r.status === "negative"
        ? "Âm kho"
        : r.status === "out"
          ? "Hết hàng"
          : "Sắp hết";
  } else if (type === "orders") {
    const s = r.status;
    cls =
      s === "completed"
        ? "ok"
        : s === "pending" || s === "Draft"
          ? "warn"
          : "info";
    label =
      s === "pending" || s === "Draft"
        ? "Phiếu tạm"
        : s === "partially_invoiced"
          ? "Đã ra 1 phần HĐ"
          : s === "confirmed"
            ? "Đã xác nhận"
            : s === "completed"
              ? "Hoàn thành"
              : s;
  }
  return (
    <span className={`dt-st ${cls}`}>
      <i />
      {label}
    </span>
  );
}

const HEAD: Record<TaskType, string[]> = {
  orders: ["Mã đơn", "Đối tác / Chi nhánh", "Giá trị", "Lúc", "Trạng thái", ""],
  debt: ["Mã đơn", "Đối tác", "Số tiền", "Hạn", "Trạng thái", ""],
  cod: [
    "Mã GH",
    "Đối tác / Chi nhánh",
    "Tiền COD",
    "Dự kiến",
    "Trạng thái",
    "",
  ],
  stock: ["Mã SKU", "Sản phẩm / Chi nhánh", "Tồn", "ĐVT", "Trạng thái", ""],
};

const LINK: Record<TaskType, string> = {
  orders: "/don-hang/dat-hang",
  debt: "/khach-hang",
  cod: "/don-hang/dat-hang",
  stock: "/san-pham/danh-sach",
};

export function TaskTabs({
  tabs,
  active,
  onTabChange,
  rows,
  counts,
  loading,
  orderStatus = "",
  onOrderStatusChange,
}: Props) {
  const heads = HEAD[active];

  // Sort phía client trên các cột số (đã có sẵn toàn bộ rows).
  // key: "value" (cột tiền/tồn) | "time" (cột Lúc/Hạn/Dự kiến).
  const [sortBy, setSortBy] = useState<"value" | "time" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortValue = (r: TaskRow, key: "value" | "time"): number => {
    if (key === "value") return r.value ?? 0;
    if (active === "debt") return r.ageDays ?? 0;
    return r.time ? new Date(r.time).getTime() : 0;
  };

  const sortedRows = useMemo(() => {
    if (!sortBy) return rows;
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = sortValue(a, sortBy);
      const bv = sortValue(b, sortBy);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortBy, sortDir, active]);

  // Cột nào sortable theo index header: 2 = tiền/tồn, 3 = thời gian/hạn.
  const SORT_COL: Record<number, "value" | "time"> = { 2: "value", 3: "time" };

  const handleSort = (key: "value" | "time") => {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortBy(null);
      setSortDir("desc");
    }
  };

  return (
    <div className="dt-panel flex flex-col">
      <div
        className="flex items-center gap-1 px-5 border-b flex-wrap"
        style={{ borderColor: "var(--dt-border)" }}>
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className="py-[13px] px-[14px] text-[13.5px] font-semibold inline-flex items-center gap-2 -mb-px border-b-2 transition"
              style={{
                color: on ? "var(--dt-primary)" : "var(--dt-text-secondary)",
                borderColor: on ? "var(--dt-primary)" : "transparent",
              }}>
              {t.label}
              <span
                className="text-[11px] font-bold dt-mono px-[7px] py-px rounded-[20px]"
                style={{
                  background: on ? "var(--dt-primary)" : "var(--dt-cyan-bg)",
                  color: on ? "#fff" : "var(--dt-primary-deep)",
                }}>
                {counts[t.key] ?? 0}
              </span>
            </button>
          );
        })}

        {active === "orders" && onOrderStatusChange && (
          <select
            className="dt-select dt-select-sm ml-auto my-2"
            value={orderStatus}
            onChange={(e) => onOrderStatusChange(e.target.value)}>
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {heads.map((h, i) => {
                const sortKey = SORT_COL[i];
                const isNum = i === 2;
                return (
                  <th
                    key={i}
                    onClick={sortKey ? () => handleSort(sortKey) : undefined}
                    className={`text-[11.5px] uppercase tracking-wide font-semibold px-5 py-3 border-b ${
                      isNum ? "text-right" : "text-left"
                    } ${sortKey ? "cursor-pointer select-none hover:bg-[var(--dt-bg-soft)]" : ""}`}
                    style={{
                      color: "var(--dt-text-muted)",
                      borderColor: "var(--dt-border)",
                    }}>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isNum ? "justify-end" : ""
                      }`}>
                      {h}
                      {sortKey &&
                        (sortBy === sortKey && sortDir === "desc" ? (
                          <ArrowDown className="w-3 h-3" />
                        ) : sortBy === sortKey && sortDir === "asc" ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-sm"
                  style={{ color: "var(--dt-text-muted)" }}>
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-sm"
                  style={{ color: "var(--dt-text-muted)" }}>
                  Không có mục nào cho lựa chọn này.
                </td>
              </tr>
            ) : (
              sortedRows.map((r, i) => (
                <tr
                  key={`${r.code}-${i}`}
                  className="border-b transition hover:bg-[var(--dt-cyan-bg)]"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <td className="px-5 py-[13px] text-[13.5px]">
                    <Link
                      className="dt-mono font-semibold"
                      style={{ color: "var(--dt-primary-deep)" }}
                      href={`/don-hang/dat-hang?Code=${r.code}`}
                      target="_blank">
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-5 py-[13px] text-[13.5px]">
                    <b className="block font-semibold">{r.partner}</b>
                    {r.branchName && (
                      <span
                        className="text-[12px]"
                        style={{ color: "var(--dt-text-muted)" }}>
                        {r.branchName}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-5 py-[13px] text-[13.5px] dt-mono font-semibold text-right"
                    style={{
                      color:
                        active === "stock" && r.value < 0
                          ? DT_COLORS.error
                          : "inherit",
                    }}>
                    {active === "stock" ? vi(r.value) : money(r.value)}
                  </td>
                  <td className="px-5 py-[13px] text-[13.5px]">
                    {active === "stock" ? r.unit : timeText(r, active)}
                  </td>
                  <td className="px-5 py-[13px] text-[13.5px]">
                    {statusChip(r, active)}
                  </td>
                  <td className="px-5 py-[13px] text-right">
                    <Link
                      href={`/don-hang/dat-hang?Code=${r.code}`}
                      target="_blank"
                      className="inline-flex"
                      style={{ color: "var(--dt-text-muted)" }}>
                      <ChevronRight className="w-[18px] h-[18px]" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
