"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import type { ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import type { RecommendationListItem } from "@/lib/types/purchasing-planning";
import { COLUMN_GROUPS } from "./columns";

/** Phạm vi dữ liệu đưa vào file xuất */
export type ExportScope = "filtered" | "all";

export interface ExportExcelOptions {
  /** Key các cột được chọn, đã sắp theo đúng thứ tự cột của bảng */
  columnKeys: string[];
  scope: ExportScope;
}

interface Props {
  /** Toàn bộ cột xuất được của bảng, theo đúng thứ tự hiển thị */
  columns: ColumnConfig<RecommendationListItem>[];
  /** Số dòng khớp bộ lọc hiện tại — hiển thị để người dùng biết sẽ xuất bao nhiêu */
  filteredTotal?: number;
  isExporting: boolean;
  onClose: () => void;
  onConfirm: (opts: ExportExcelOptions) => void;
}

export function ExportExcelModal({
  columns,
  filteredTotal,
  isExporting,
  onClose,
  onConfirm,
}: Props) {
  // Mặc định chọn đúng các cột đang hiển thị trên bảng
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.visible).map((c) => c.key))
  );
  const [scope, setScope] = useState<ExportScope>("filtered");

  /**
   * Gom cột theo nhóm để danh sách hơn 30 cột vẫn dễ đọc.
   * Cột không nằm trong nhóm nào được dồn vào "Khác" nên khi thêm cột mới
   * mà quên cập nhật COLUMN_GROUPS thì nó vẫn hiện ra, không bị mất.
   */
  const groups = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const used = new Set<string>();

    const result: { title: string; cols: ColumnConfig<RecommendationListItem>[] }[] =
      [];

    for (const [title, keys] of Object.entries(COLUMN_GROUPS)) {
      const cols = keys
        .map((k) => byKey.get(k))
        .filter((c): c is ColumnConfig<RecommendationListItem> => !!c);
      cols.forEach((c) => used.add(c.key));
      if (cols.length) result.push({ title, cols });
    }

    const rest = columns.filter((c) => !used.has(c.key));
    if (rest.length) result.push({ title: "Khác", cols: rest });

    return result;
  }, [columns]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(columns.map((c) => c.key)));
  const clearAll = () => setSelected(new Set());

  const handleConfirm = () => {
    // Giữ đúng thứ tự cột của bảng, không theo thứ tự người dùng bấm chọn
    const columnKeys = columns
      .filter((c) => selected.has(c.key))
      .map((c) => c.key);
    onConfirm({ columnKeys, scope });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Xuất Excel</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {/* ── Phạm vi dữ liệu ── */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Phạm vi dữ liệu
            </p>
            <div className="space-y-2">
              <label className="flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="pp-export-scope"
                  checked={scope === "filtered"}
                  onChange={() => setScope("filtered")}
                  className="mt-0.5 accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Theo bộ lọc hiện tại
                    {filteredTotal !== undefined && (
                      <span className="ml-1 font-normal text-gray-500">
                        ({filteredTotal.toLocaleString("vi-VN")} sản phẩm)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Xuất toàn bộ kết quả khớp bộ lọc, không giới hạn trang đang
                    xem.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer select-none items-start gap-2.5 rounded-lg border p-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="pp-export-scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="mt-0.5 accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Xuất tất cả
                  </p>
                  <p className="text-xs text-gray-500">
                    Bỏ qua mọi bộ lọc, lấy toàn bộ sản phẩm của kỳ tính hiện
                    tại.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* ── Chọn cột ── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Cột xuất{" "}
                <span className="font-normal text-gray-400">
                  (đã chọn {selected.size}/{columns.length})
                </span>
              </p>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-brand hover:underline">
                  Chọn tất cả
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-gray-500 hover:underline">
                  Bỏ chọn tất cả
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="mb-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                    {g.title}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
                    {g.cols.map((col) => (
                      <label
                        key={col.key}
                        className="flex cursor-pointer select-none items-center gap-2 rounded px-1 py-1 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selected.has(col.key)}
                          onChange={() => toggle(col.key)}
                          className="accent-brand"
                        />
                        <span className="truncate text-sm text-gray-700">
                          {col.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 rounded-b-xl border-t bg-gray-50 px-6 py-4">
          <span className="text-xs text-gray-500">
            {selected.size === 0 && "Chọn ít nhất một cột để xuất."}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100">
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isExporting || selected.size === 0}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark disabled:opacity-50">
              {isExporting && <Loader2 className="h-4 w-4 animate-spin" />}
              Xuất file
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
