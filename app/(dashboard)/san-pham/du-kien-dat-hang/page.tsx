"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { PurchasingPlanningSidebar } from "@/components/purchasing-planning/PurchasingPlanningSidebar";
import { RecommendationListView } from "@/components/purchasing-planning/RecommendationListView";
import { RecommendationSummaryTable } from "@/components/purchasing-planning/RecommendationSummaryTable";
import { RecommendationToolbar } from "@/components/purchasing-planning/RecommendationToolbar";
import { RecommendationPagination } from "@/components/purchasing-planning/RecommendationPagination";
import { RecommendationDetailPanel } from "@/components/purchasing-planning/RecommendationDetailPanel";
import {
  ExportExcelModal,
  type ExportExcelOptions,
} from "@/components/purchasing-planning/ExportExcelModal";
import { buildColumns } from "@/components/purchasing-planning/columns";
import {
  useRecommendations,
  useRunPurchasingCalculation,
} from "@/lib/hooks/usePurchasingPlanning";
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
import {
  buildExportFilters,
  fetchAllForExport,
} from "@/lib/utils/purchasing-planning-fetch-all";
import type { ViewMode } from "@/lib/types/purchasing-planning";

const VIEW_MODE_KEY = "pp-view-mode";

/**
 * Trang "Dự kiến đặt hàng" — Module Purchasing Planning
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
  const canRun = useCan("purchasing_planning", "run");
  const runCalculation = useRunPurchasingCalculation();

  const handleRunCalculation = useCallback(async () => {
    try {
      const result = await runCalculation.mutateAsync();
      toast.success(
        `Đã tính xong ${result.skuTotal.toLocaleString("vi-VN")} sản phẩm` +
          (result.skuBlocked > 0
            ? ` · ${result.skuBlocked} sản phẩm thiếu dữ liệu`
            : "")
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không chạy được tính toán");
    }
  }, [runCalculation]);

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
    () => (suppliersRes?.data ?? []).map((s) => ({ id: s.id, name: s.name })),
    [suppliersRes]
  );

  const trademarks = useMemo(
    () => (trademarksRes ?? []).map((t) => ({ id: t.id, name: t.name })),
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
    () => columns.map((c) => ({ key: c.key, label: c.label, visible: c.visible })),
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
        const rows = await fetchAllForExport(buildExportFilters(filters, scope));

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

        <div
          className="mt-4 mr-4 mb-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white"
          style={{ borderColor: "var(--dt-border)" }}>
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
            onRunCalculation={canRun ? handleRunCalculation : undefined}
            isCalculating={runCalculation.isPending}
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

          <RecommendationPagination
            pagination={pagination}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        <RecommendationDetailPanel
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
        />

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
