"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import type { TaskRow } from "@/lib/api/dashboard";
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from "@/lib/types/invoice";
import { money, vi, DT_COLORS } from "@/lib/dashboard/format";
import {
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  Search,
} from "lucide-react";

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
  /** Filter trạng thái hiện tại theo tab đang mở. */
  statusFilter?: string;
  onStatusFilterChange?: (s: string) => void;
}

/** Bộ lọc riêng cho từng tab. Key rỗng = "Tất cả". */
export const TASK_FILTER_OPTIONS: Record<
  TaskType,
  { value: string; label: string }[]
> = {
  orders: [
    { value: "", label: "Tất cả trạng thái" },
    { value: "pending", label: "Phiếu tạm" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "partially_invoiced", label: "Đã ra 1 phần HĐ" },
  ],
  debt: [
    { value: "", label: "Tất cả tuổi nợ" },
    { value: "in_term", label: "Trong hạn" },
    { value: "due", label: "Đến hạn (1–30 ngày)" },
    { value: "overdue", label: "Quá hạn (> 30 ngày)" },
  ],
  cod: [
    { value: "", label: "Tất cả trạng thái" },
    { value: "3", label: "Đang xử lý" },
    { value: "5", label: "Đóng hàng" },
    { value: "6", label: "Đang giao hàng" },
    { value: "4", label: "Không giao được" },
    { value: "8", label: "Trả hàng" },
  ],
  stock: [
    { value: "", label: "Tất cả cảnh báo" },
    { value: "negative", label: "Âm kho" },
    { value: "out", label: "Hết hàng" },
    { value: "low", label: "Sắp hết" },
  ],
};

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
  } else if (type === "cod") {
    // Trạng thái hóa đơn (1-8) — map nhãn giống trang Hóa đơn.
    const st = r.invoiceStatus ?? Number(r.status);
    cls =
      st === INVOICE_STATUS.FAILED_DELIVERY
        ? "err"
        : st === INVOICE_STATUS.PROCESSING
          ? "warn"
          : "info";
    label = INVOICE_STATUS_LABELS[st] || r.status;
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
  debt: "/don-hang/hoa-don",
  cod: "/don-hang/hoa-don",
  stock: "/san-pham/danh-sach",
};

/** Link mở chứng từ theo mã: đơn hàng tab orders, hóa đơn cho debt/cod. */
function rowHref(type: TaskType, code: string): string {
  if (type === "stock") return "/san-pham/danh-sach";
  if (type === "orders") return `/don-hang/dat-hang?Code=${code}`;
  return `/don-hang/hoa-don?Code=${code}`;
}

/** Nhãn tổng số bản ghi theo tab, dùng cho dòng "Hiển thị a–b trong tổng N …". */
const COUNT_LABEL: Record<TaskType, string> = {
  orders: "đơn cần xử lý",
  debt: "công nợ đến hạn",
  cod: "đơn cần giao",
  stock: "mục cảnh báo",
};

/** Dòng tổng quan (bold) phía trên bảng, tính trên tập đã lọc theo search. */
function summaryText(rows: TaskRow[], type: TaskType): string {
  const total = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  if (type === "debt") {
    const maxAge = rows.reduce((m, r) => Math.max(m, r.ageDays ?? 0), 0);
    return `Tổng công nợ: ${money(total)} · Khách hàng: ${vi(
      rows.length,
    )} · Quá hạn lâu nhất: ${vi(maxAge)} ngày`;
  }
  if (type === "cod") {
    return `Tổng COD: ${money(total)} · Số đơn: ${vi(rows.length)}`;
  }
  if (type === "stock") {
    const neg = rows.filter((r) => (r.value ?? 0) < 0).length;
    return `Mục cảnh báo: ${vi(rows.length)} · Âm kho: ${vi(neg)}`;
  }
  return `Tổng giá trị: ${money(total)} · Số đơn: ${vi(rows.length)}`;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function TaskTabs({
  tabs,
  active,
  onTabChange,
  rows,
  counts,
  loading,
  statusFilter = "",
  onStatusFilterChange,
}: Props) {
  const heads = HEAD[active];

  // Tìm kiếm + phân trang phía client (toàn bộ rows đã tải sẵn).
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sort phía client trên các cột số (đã có sẵn toàn bộ rows).
  // key: "value" (cột tiền/tồn) | "time" (cột Lúc/Hạn/Dự kiến).
  const [sortBy, setSortBy] = useState<"value" | "time" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Reset trang khi đổi tab / search / số dòng / bộ lọc trạng thái.
  useEffect(() => {
    setPage(1);
  }, [active, search, pageSize, statusFilter]);

  const sortValue = (r: TaskRow, key: "value" | "time"): number => {
    if (key === "value") return r.value ?? 0;
    if (active === "debt") return r.ageDays ?? 0;
    return r.time ? new Date(r.time).getTime() : 0;
  };

  // Lọc theo mã đơn + tên đối tác.
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.partner.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    if (!sortBy) return filteredRows;
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      const av = sortValue(a, sortBy);
      const bv = sortValue(b, sortBy);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, sortBy, sortDir, active]);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedRows = sortedRows.slice(pageStart, pageStart + pageSize);
  const rangeFrom = totalRows === 0 ? 0 : pageStart + 1;
  const rangeTo = Math.min(pageStart + pageSize, totalRows);

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
        className="flex items-center gap-2 px-5 border-b"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto dt-no-scrollbar">
          {tabs.map((t) => {
            const on = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className="py-[13px] px-[14px] text-[13.5px] font-semibold inline-flex items-center gap-2 -mb-px border-b-2 transition whitespace-nowrap flex-none"
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
        </div>

        {onStatusFilterChange && (
          <select
            className="dt-select dt-select-sm flex-none my-2"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}>
            {TASK_FILTER_OPTIONS[active].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Search + summary */}
      <div
        className="flex items-center gap-3 px-5 py-[10px] border-b flex-wrap"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="relative flex-none">
          <Search
            className="w-[15px] h-[15px] absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--dt-text-muted)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, tên khách hàng…"
            className="dt-input dt-input-sm pl-[30px] w-[260px] max-w-full"
          />
        </div>
        <div
          className="text-[12.5px] font-bold ml-auto"
          style={{ color: "var(--dt-text-secondary)" }}>
          {summaryText(filteredRows, active)}
        </div>
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
            ) : totalRows === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-sm"
                  style={{ color: "var(--dt-text-muted)" }}>
                  Không có mục nào cho lựa chọn này.
                </td>
              </tr>
            ) : (
              pagedRows.map((r, i) => (
                <tr
                  key={`${r.code}-${i}`}
                  className="border-b transition hover:bg-[var(--dt-cyan-bg)]"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <td className="px-5 py-[13px] text-[13.5px]">
                    <Link
                      className="dt-mono font-semibold"
                      style={{ color: "var(--dt-primary-deep)" }}
                      href={rowHref(active, r.code)}
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
                      href={rowHref(active, r.code)}
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

      {/* Pagination footer */}
      {!loading && totalRows > 0 && (
        <div
          className="flex items-center gap-3 px-5 py-[11px] border-t flex-wrap text-[12.5px]"
          style={{ borderColor: "var(--dt-border)", color: "var(--dt-text-secondary)" }}>
          <span>
            Hiển thị <b>{vi(rangeFrom)}</b>–<b>{vi(rangeTo)}</b> trong tổng{" "}
            <b>{vi(totalRows)}</b> {COUNT_LABEL[active]}
          </span>
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <select
              className="dt-select dt-select-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} dòng/trang
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[7px] border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--dt-bg-soft)]"
                style={{ borderColor: "var(--dt-border)" }}
                aria-label="Trang trước">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                Trang <b>{vi(safePage)}</b> / {vi(totalPages)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[7px] border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--dt-bg-soft)]"
                style={{ borderColor: "var(--dt-border)" }}
                aria-label="Trang sau">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
