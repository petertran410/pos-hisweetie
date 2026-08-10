"use client";

import { AlertTriangle, Download, Info, Loader2, Settings2 } from "lucide-react";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { ViewModeToggle } from "./ViewModeToggle";
import { money, num } from "./columns";
import type {
  PaginationMeta,
  RecommendationFilters,
  RecommendationListMeta,
  RecommendationSortBy,
  ViewMode,
} from "@/lib/types/purchasing-planning";

interface Props {
  meta?: RecommendationListMeta;
  pagination?: PaginationMeta;
  filters: RecommendationFilters;
  onFiltersChange: (f: Partial<RecommendationFilters>) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  isMock?: boolean;
  isError?: boolean;
  /** Chỉ hiển thị nút chọn cột khi đang ở chế độ bảng */
  columns?: { key: string; label: string; visible: boolean }[];
  onToggleColumn?: (key: string) => void;
  /** Mở hộp thoại cấu hình xuất Excel — chỉ dùng ở chế độ bảng */
  onExportExcel?: () => void;
  isExporting?: boolean;
  onOpenConfig?: () => void;
}

export function RecommendationToolbar({
  meta,
  pagination,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  isMock,
  isError,
  columns,
  onToggleColumn,
  onExportExcel,
  isExporting,
  onOpenConfig,
}: Props) {
  return (
    <>
      {/* ── Cảnh báo dữ liệu mẫu ── */}
      {isMock && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Đang hiển thị <strong>dữ liệu mẫu</strong> để review giao diện.
            Backend chưa hoàn thành — các con số chưa phản ánh tồn kho thật.
          </span>
        </div>
      )}

      {/* ── Cảnh báo snapshot cũ ── */}
      {meta?.isStale && (
        <div className="flex items-center gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs text-orange-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Dữ liệu tính ngày{" "}
            <strong>
              {new Date(meta.snapshotDate).toLocaleDateString("vi-VN")}
            </strong>{" "}
            — đã quá 24 giờ.
          </span>
        </div>
      )}

      {/* ── Thanh công cụ ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">
            {isError
              ? "Lỗi tải dữ liệu"
              : pagination
                ? `${num(pagination.total)} sản phẩm`
                : "Đang tải..."}
          </span>
          {meta?.totalEstimatedValue ? (
            <span className="text-gray-500">
              Giá trị đề xuất:{" "}
              <span className="font-medium text-gray-800">
                {money(meta.totalEstimatedValue)}
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenConfig && (
            <button
              type="button"
              onClick={onOpenConfig}
              className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Settings2 className="h-4 w-4" />
              Cấu hình
            </button>
          )}
          <ViewModeToggle value={viewMode} onChange={onViewModeChange} />

          {viewMode === "table" && columns && onToggleColumn && (
            <ColumnToggle
              columns={columns}
              onToggle={onToggleColumn}
              label="Cột"
            />
          )}

          {viewMode === "table" && onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Xuất Excel
            </button>
          )}

          {viewMode === "list" && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500">Sắp xếp:</span>
              <select
                value={filters.sortBy ?? "priority"}
                onChange={(e) =>
                  onFiltersChange({
                    sortBy: e.target.value as RecommendationSortBy,
                    page: 1,
                  })
                }
                className="rounded border px-2 py-1 outline-none"
                style={{ borderColor: "var(--dt-border)" }}>
                <option value="priority">Mức ưu tiên</option>
                <option value="stockout">Sắp hết hàng</option>
                <option value="value">Giá trị đặt</option>
                <option value="gap">Mức thiếu hụt</option>
                <option value="code">Mã hàng</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
