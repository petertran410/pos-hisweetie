"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  AnalyticsTable,
  type AnalyticsColumn,
} from "@/components/reports/analytics/shared/AnalyticsTable";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { BLANK_LABEL } from "@/components/reports/analytics/analyticsFormat";

// Phần dùng chung của các trang Kế Toán: định dạng số (#,0 / #,0.0 như Power BI),
// bảng có phân trang + sắp xếp, xuất Excel, bộ lọc Chi Nhánh / Ngày.

/** "#,0" — để trống khi BLANK như Power BI. */
export function fmtInt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("vi-VN");
}

/** "#,0.0". */
export function fmtDec1(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** YYYY-MM-DD → dd/mm/yyyy; null → "(Trống)". */
export function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === "") return BLANK_LABEL;
  return String(v).slice(0, 10).split("-").reverse().join("/");
}

export const textOrBlank = (v: unknown) =>
  v === null || v === undefined || v === "" ? BLANK_LABEL : String(v);

// ── Bảng có phân trang + sắp xếp (bọc AnalyticsTable dùng chung) ─────────────
export interface KeToanColumn<T> extends AnalyticsColumn<T> {
  /** Giá trị đưa ra Excel (mặc định: value(row) hoặc row[key]). */
  exportValue?: (row: T) => string | number | null;
  /** Nhãn dạng chữ (cho Excel) khi label là ReactNode. */
  title?: string;
  sortable?: boolean;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function cellValue<T>(c: AnalyticsColumn<T>, row: T): unknown {
  return c.value ? c.value(row) : (row as Record<string, unknown>)[c.key];
}

function compare(a: unknown, b: unknown): number {
  const an = a === null || a === undefined || a === "";
  const bn = b === null || b === undefined || b === "";
  if (an || bn) return an && bn ? 0 : an ? -1 : 1; // BLANK nhỏ nhất (như Power BI)
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "vi");
}

export function PagedTable<T>({
  columns,
  rows,
  totals,
  rowKey,
  pageSize = 100,
  maxHeight = 620,
  empty,
}: {
  columns: KeToanColumn<T>[];
  rows: T[];
  totals?: T | null;
  rowKey?: (row: T, i: number) => string | number;
  pageSize?: number;
  maxHeight?: number;
  empty?: string;
}) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const k = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort(
      (a, b) => k * compare(cellValue(col, a), cellValue(col, b)),
    );
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = sorted.slice(cur * pageSize, (cur + 1) * pageSize);

  const cols: AnalyticsColumn<T>[] = columns.map((c) => {
    if (!c.sortable) return c;
    const on = sort?.key === c.key;
    return {
      ...c,
      label: (
        <button
          type="button"
          className="inline-flex items-center gap-1 hover:text-[var(--dt-primary)]"
          onClick={() => {
            setPage(0);
            setSort((s) =>
              s?.key !== c.key
                ? { key: c.key, dir: c.align === "right" ? "desc" : "asc" }
                : s.dir === "desc"
                  ? { key: c.key, dir: "asc" }
                  : null,
            );
          }}>
          {c.label}
          {on &&
            (sort?.dir === "asc" ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            ))}
        </button>
      ),
    };
  });

  return (
    <div className="space-y-2">
      <AnalyticsTable
        columns={cols}
        rows={slice}
        totals={totals}
        rowKey={rowKey ? (r, i) => rowKey(r, cur * pageSize + i) : undefined}
        maxHeight={maxHeight}
        empty={empty}
      />
      {sorted.length > pageSize && (
        <div
          className="flex items-center justify-end gap-2 text-[12px]"
          style={{ color: "var(--dt-text-muted)" }}>
          <span>
            Dòng {(cur * pageSize + 1).toLocaleString("vi-VN")}–
            {Math.min((cur + 1) * pageSize, sorted.length).toLocaleString(
              "vi-VN",
            )}{" "}
            / {sorted.length.toLocaleString("vi-VN")}
          </span>
          <button
            type="button"
            aria-label="Trang trước"
            disabled={cur === 0}
            onClick={() => setPage(cur - 1)}
            className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-gray-50"
            style={{ borderColor: "var(--dt-border)" }}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span>
            Trang {cur + 1}/{pages}
          </span>
          <button
            type="button"
            aria-label="Trang sau"
            disabled={cur >= pages - 1}
            onClick={() => setPage(cur + 1)}
            className="p-1.5 rounded-md border disabled:opacity-40 hover:bg-gray-50"
            style={{ borderColor: "var(--dt-border)" }}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Xuất Excel ───────────────────────────────────────────────────────────────
export interface ExportSheet<T> {
  name: string;
  columns: KeToanColumn<T>[];
  rows: T[];
  totals?: T | null;
}

function exportCell<T>(c: KeToanColumn<T>, row: T): string | number | null {
  if (c.exportValue) return c.exportValue(row);
  const v = cellValue(c, row);
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? v : String(v);
}

function colTitle<T>(c: KeToanColumn<T>): string {
  return c.title ?? (typeof c.label === "string" ? c.label : c.key);
}

/** Ghi các bảng ra file .xlsx (mỗi bảng 1 sheet). Nạp thư viện xlsx khi bấm. */
export async function exportSheets(
  fileBase: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sheets: ExportSheet<any>[],
) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const header = s.columns.map(colTitle);
    const body = s.rows.map((r) => s.columns.map((c) => exportCell(c, r)));
    if (s.totals) {
      body.push(
        s.columns.map((c, i) => {
          const v = exportCell(c, s.totals);
          return i === 0 && (v === null || v === "") ? "Tổng" : v;
        }),
      );
    }
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws["!cols"] = header.map((h, i) => {
      const longest = Math.max(
        h.length,
        ...body.slice(0, 300).map((r) => String(r[i] ?? "").length),
      );
      return { wch: Math.min(50, Math.max(10, longest + 2)) };
    });
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  XLSX.writeFile(
    wb,
    `${fileBase}_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.xlsx`,
  );
}

export function ExportButton({
  onExport,
  disabled,
}: {
  onExport: () => Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch (e) {
          toast.error((e as Error).message || "Không xuất được file");
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3 py-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
      style={{
        borderColor: "var(--dt-border)",
        color: "var(--dt-text-secondary)",
      }}>
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      Xuất Excel
    </button>
  );
}

// ── Bộ lọc Chi Nhánh (chọn 1, nút ngang) + Ngày (khoảng) ────────────────────
export function BranchDateFilter({
  branches,
  branch,
  from,
  to,
  onChange,
  right,
}: {
  branches: string[];
  branch?: string;
  from?: string;
  to?: string;
  onChange: (p: { branch?: string; from?: string; to?: string }) => void;
  right?: ReactNode;
}) {
  const dirty = !!(branch || from || to);
  return (
    <div className="dt-panel p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--dt-text-secondary)" }}>
          Chi Nhánh
        </span>
        <div className="dt-seg">
          <button
            type="button"
            data-on={!branch}
            onClick={() => onChange({ branch: undefined, from, to })}>
            Tất cả
          </button>
          {branches.map((b) => (
            <button
              key={b}
              type="button"
              data-on={branch === b}
              onClick={() =>
                onChange({ branch: branch === b ? undefined : b, from, to })
              }>
              {b}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-[12.5px] font-semibold"
          style={{ color: "var(--dt-text-secondary)" }}>
          Ngày
        </span>
        <div className="w-36">
          <DatePickerInput
            value={from ?? ""}
            onChange={(v) => onChange({ branch, from: v || undefined, to })}
            placeholder="Từ ngày"
          />
        </div>
        <span style={{ color: "var(--dt-text-muted)" }}>–</span>
        <div className="w-36">
          <DatePickerInput
            value={to ?? ""}
            onChange={(v) => onChange({ branch, from, to: v || undefined })}
            placeholder="Đến ngày"
            minDate={from}
          />
        </div>
      </div>
      {dirty && (
        <button
          type="button"
          onClick={() => onChange({})}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
          style={{ color: "var(--dt-text-secondary)" }}>
          <RotateCcw className="w-3.5 h-3.5" />
          Xoá lọc
        </button>
      )}
      <div className="flex-1" />
      {right}
    </div>
  );
}

// ── Trạng thái tải / lỗi ─────────────────────────────────────────────────────
export function LoadState({
  error,
  loading,
  children,
}: {
  error: unknown;
  loading: boolean;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="dt-panel p-6 text-center text-[13px] text-red-600">
        Không tải được báo cáo: {(error as Error).message}
      </div>
    );
  if (loading) return <div className="dt-sk h-[520px] rounded-xl" />;
  return <>{children}</>;
}

export function UpdatedAt({ at }: { at?: string }) {
  if (!at) return null;
  return (
    <div
      className="text-[11.5px] text-right"
      style={{ color: "var(--dt-text-muted)" }}>
      Dữ liệu cập nhật vào lúc {new Date(at).toLocaleString("vi-VN")}
    </div>
  );
}
