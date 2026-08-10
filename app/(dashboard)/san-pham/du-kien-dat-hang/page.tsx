"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { PurchasingPlanningSidebar } from "@/components/purchasing-planning/PurchasingPlanningSidebar";
import { RecommendationListView } from "@/components/purchasing-planning/RecommendationListView";
import { RecommendationSummaryTable } from "@/components/purchasing-planning/RecommendationSummaryTable";
import { RecommendationToolbar } from "@/components/purchasing-planning/RecommendationToolbar";
import { RecommendationDetailPanel } from "@/components/purchasing-planning/RecommendationDetailPanel";
import { PurchasingPlanningConfigModal } from "@/components/purchasing-planning/PurchasingPlanningConfigModal";
import {
  ExportExcelModal,
  type ExportExcelOptions,
} from "@/components/purchasing-planning/ExportExcelModal";
import { buildColumns } from "@/components/purchasing-planning/columns";
import { useRecommendations } from "@/lib/hooks/usePurchasingPlanning";
import { usePurchasingPlanningFilters } from "@/lib/hooks/usePurchasingPlanningTableState";
import { useColumnVisibility } from "@/lib/hooks/useColumnVisibility";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useTrademarks } from "@/lib/hooks/useTrademarks";
import { useCategories } from "@/lib/hooks/useCategories";
import { useCan } from "@/lib/hooks/useCan";
import { purchasingPlanningApi } from "@/lib/api/purchasing-planning";
import {
  exportRecommendationsToExcel,
  getExportableColumns,
} from "@/lib/utils/purchasing-planning-export";
import type {
  RecommendationFilters,
  RecommendationListItem,
  ViewMode,
} from "@/lib/types/purchasing-planning";

const VIEW_MODE_KEY = "pp-view-mode";

/**
 * Số dòng xin ở một lần gọi khi xuất Excel. Backend có thể tự giới hạn thấp
 * hơn — khi đó `fetchAllForExport` sẽ tự lấy nốt các trang còn lại.
 */
const EXPORT_PAGE_LIMIT = 100000;

/**
 * Lấy TOÀN BỘ dòng khớp bộ lọc, không giới hạn trang đang xem.
 *
 * Gọi trực tiếp API thay vì dùng React Query để không ghi đè cache của bảng
 * đang hiển thị.
 */
async function fetchAllForExport(
  filters: RecommendationFilters
): Promise<RecommendationListItem[]> {
  let first;
  try {
    first = await purchasingPlanningApi.getRecommendations({
      ...filters,
      page: 1,
      limit: EXPORT_PAGE_LIMIT,
    });
  } catch {
    // Một số backend validate limit tối đa thay vì tự cắt về mức cho phép.
    // Khi đó dùng page size hiện tại rồi tải tuần tự toàn bộ các trang.
    first = await purchasingPlanningApi.getRecommendations({
      ...filters,
      page: 1,
      limit: filters.limit ?? 50,
    });
  }

  const items = [...first.items];
  const total = first.pagination?.total ?? items.length;
  // Backend có thể cắt bớt `limit` so với mức yêu cầu → lấy mức thực tế
  const pageSize = first.items.length || first.pagination?.limit || 0;

  if (pageSize <= 0) return items;

  const totalPages = Math.ceil(total / pageSize);
  for (let page = 2; items.length < total && page <= totalPages; page++) {
    const res = await purchasingPlanningApi.getRecommendations({
      ...filters,
      page,
      limit: pageSize,
    });
    if (!res.items.length) break;
    items.push(...res.items);
  }

  return items;
}

/**
 * Trang "Dự kiến đặt hàng" — Module Purchasing Planning
 *
 * Tham chiếu:
 *   - Nghiệp vụ : docs/purchasing-planning-prd.md §12.4, §12.5
 *   - Kỹ thuật  : docs/purchasing-planning-technical-design.md §13
 *
 * Trang KHÔNG chứa business logic. Mọi con số (mức ưu tiên, số lượng đề xuất,
 * câu kết luận) đều do backend tính và trả về.
 */
export default function PurchasingPlanningPage() {
  // Bộ lọc được ghi nhớ trên máy người dùng giữa các lần mở trang
  const [filters, handleFiltersChange] = usePurchasingPlanningFilters();

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configSku, setConfigSku] = useState<{
    id: number;
    code: string;
    name: string;
  } | null>(null);
  const canConfig = useCan("purchasing_planning", "config");

  // Khôi phục chế độ xem đã chọn lần trước.
  // Dùng lazy initializer thay useEffect để tránh render thừa 1 lần.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      return saved === "table" ? "table" : "list";
    } catch {
      return "list";
    }
  });

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // bỏ qua
    }
  }, []);

  // ── Dữ liệu chính ──
  const { data, isLoading, isError } = useRecommendations(filters);

  // ── Dữ liệu cho các bộ lọc (lấy từ API thật) ──
  const { data: suppliersRes } = useSuppliers({ pageSize: 500 });
  const { data: trademarksRes } = useTrademarks();
  const { data: parentCats } = useCategories("parent");
  const { data: middleCats } = useCategories("middle");
  const { data: childCats } = useCategories("child");

  const suppliers = useMemo(
    () =>
      (suppliersRes?.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
    [suppliersRes]
  );

  const trademarks = useMemo(
    () =>
      (trademarksRes ?? []).map((t) => ({
        id: t.id,
        name: t.name,
      })),
    [trademarksRes]
  );

  const toNames = (list?: { name: string }[]) =>
    (list ?? []).map((c) => c.name).filter(Boolean);

  // ── Cấu hình cột cho chế độ bảng ──
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "pp-summary-columns",
    buildColumns()
  );

  const columnMeta = useMemo(
    () =>
      columns.map((c) => ({
        key: c.key,
        label: c.label,
        visible: c.visible,
      })),
    [columns]
  );

  // Cột đưa vào hộp thoại xuất Excel — bỏ cột không có giá trị xuất
  const exportableColumns = useMemo(
    () => getExportableColumns(columns),
    [columns]
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const handleExport = useCallback(
    async ({ columnKeys, scope }: ExportExcelOptions) => {
      setIsExporting(true);
      try {
        // "Xuất tất cả" bỏ mọi bộ lọc nhưng vẫn giữ snapshot và thứ tự đang xem.
        const exportFilters: RecommendationFilters =
          scope === "all"
            ? {
                date: filters.date,
                needsOrderOnly: false,
                sortBy: filters.sortBy,
                sortDir: filters.sortDir,
              }
            : { ...filters };

        const rows = await fetchAllForExport(exportFilters);

        if (rows.length === 0) {
          toast.warning("Không có dữ liệu để xuất");
          return;
        }

        const selected = new Set(columnKeys);
        const cols = exportableColumns.filter((c) => selected.has(c.key));

        const count = exportRecommendationsToExcel(rows, cols);
        toast.success(`Đã xuất ${count.toLocaleString("vi-VN")} dòng`);
        setExportOpen(false);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Không xuất được file Excel"
        );
      } finally {
        setIsExporting(false);
      }
    },
    [filters, exportableColumns]
  );

  return (
    <PagePermissionGuard resource="purchasing_planning" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <PurchasingPlanningSidebar
          filters={filters}
          setFilters={handleFiltersChange}
          meta={data?.meta}
          suppliers={suppliers}
          trademarks={trademarks}
          parentCategories={toNames(parentCats)}
          middleCategories={toNames(middleCats)}
          childCategories={toNames(childCats)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <RecommendationToolbar
            meta={data?.meta}
            pagination={pagination}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            isMock={purchasingPlanningApi.isMock}
            isError={isError}
            columns={columnMeta}
            onToggleColumn={toggleColumn}
            onExportExcel={() => setExportOpen(true)}
            isExporting={isExporting}
            onOpenConfig={
              canConfig
                ? () => {
                    setConfigSku(null);
                    setConfigOpen(true);
                  }
                : undefined
            }
          />

          {viewMode === "list" ? (
            <RecommendationListView
              items={items}
              isLoading={isLoading}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
            />
          ) : (
            <RecommendationSummaryTable
              items={items}
              visibleColumns={visibleColumns}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              isLoading={isLoading}
            />
          )}

          {/* ── Phân trang ── */}
          {pagination && pagination.totalPages > 1 && (
            <div
              className="flex items-center justify-between border-t px-4 py-2 text-sm"
              style={{ borderColor: "var(--dt-border)" }}>
              <span className="text-gray-500">
                Trang {pagination.page}/{pagination.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    handleFiltersChange({ page: pagination.page - 1 })
                  }
                  className="rounded border p-1.5 disabled:opacity-40"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    handleFiltersChange({ page: pagination.page + 1 })
                  }
                  className="rounded border p-1.5 disabled:opacity-40"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <RecommendationDetailPanel
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
          canConfig={canConfig}
          onAdjustConfig={(sku) => {
            setConfigSku(sku);
            setConfigOpen(true);
          }}
        />

        {configOpen && (
          <PurchasingPlanningConfigModal
            key={configSku?.id ?? "global"}
            open
            initialSku={configSku}
            onClose={() => setConfigOpen(false)}
          />
        )}

        {exportOpen && (
          <ExportExcelModal
            columns={exportableColumns}
            filteredTotal={pagination?.total}
            isExporting={isExporting}
            onClose={() => setExportOpen(false)}
            onConfirm={handleExport}
          />
        )}
      </div>
    </PagePermissionGuard>
  );
}
