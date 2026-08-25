"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  Info,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
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
  onRunCalculation?: () => void;
  isCalculating?: boolean;
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
  onRunCalculation,
  isCalculating,
}: Props) {
  return (
    <>
      {/* ── Tiêu đề trang + tìm kiếm + hành động ── */}
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="whitespace-nowrap text-base font-semibold text-gray-900">
            Dự kiến đặt hàng
          </h1>
          <SearchBox
            // Remount khi bộ lọc bị xoá từ nơi khác (nút "Xóa tất cả" ở
            // sidebar) để ô nhập tự trả về rỗng, thay vì đồng bộ bằng effect.
            key={filters.search ?? ""}
            value={filters.search ?? ""}
            onCommit={(value) =>
              onFiltersChange({ search: value || undefined, page: 1 })
            }
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
              title="Xuất Excel theo bộ lọc hiện tại"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: "var(--dt-border)" }}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Xuất file
            </button>
          )}

          {onRunCalculation && (
            <button
              type="button"
              onClick={onRunCalculation}
              disabled={isCalculating || isMock}
              title={
                isMock
                  ? "Không thể chạy tính toán khi đang dùng dữ liệu mẫu"
                  : "Tính lại đề xuất từ tồn kho, đơn nhập và lịch sử bán hàng hiện tại"
              }
              className="bg-brand hover:bg-brand-dark flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw
                className={`h-4 w-4 ${isCalculating ? "animate-spin" : ""}`}
              />
              {isCalculating ? "Đang tính..." : "Chạy tính toán"}
            </button>
          )}
        </div>
      </div>

      {/* ── Cảnh báo dữ liệu mẫu ── */}
      {isMock && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Đang hiển thị <strong>dữ liệu mẫu</strong> để review giao diện.
            Backend chưa hoàn thành — các con số chưa phản ánh tồn kho thật.
          </span>
        </div>
      )}

      {/* ── Cảnh báo snapshot cũ ── */}
      {meta?.isStale && (
        <div className="flex shrink-0 items-center gap-2 border-b border-orange-200 bg-orange-50 px-4 py-2 text-xs text-orange-800">
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

      {/* ── Dòng tóm tắt kết quả ── */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-gray-50/60 px-4 py-2"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium text-gray-700">
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
              className="rounded border bg-white px-2 py-1 outline-none"
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
    </>
  );
}

/**
 * Ô tìm kiếm có độ trễ — gõ tới đâu hiện tới đó, nhưng chỉ gọi API sau khi
 * người dùng ngừng gõ. Component tách riêng để cha có thể remount bằng `key`
 * mỗi khi bộ lọc bị xoá từ nơi khác.
 */
function SearchBox({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onCommit(draft), 350);
    return () => clearTimeout(timer);
  }, [draft, value, onCommit]);

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="Theo mã, tên sản phẩm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="focus:ring-brand w-64 rounded-lg border py-1.5 pr-3 pl-9 text-sm focus:ring-2 focus:outline-none"
        style={{ borderColor: "var(--dt-border)" }}
      />
    </div>
  );
}
