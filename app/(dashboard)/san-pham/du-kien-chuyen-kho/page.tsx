"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { TransferPlanningSidebar } from "@/components/transfer-planning/TransferPlanningSidebar";
import { TransferPlanningToolbar } from "@/components/transfer-planning/TransferPlanningToolbar";
import { TransferPlanningTable } from "@/components/transfer-planning/TransferPlanningTable";
import { TransferPlanningPagination } from "@/components/transfer-planning/TransferPlanningPagination";
import { TransferPlanningDetailPanel } from "@/components/transfer-planning/TransferPlanningDetailPanel";
import {
  TransferDrilldownModal,
  type TransferDrilldownVariant,
} from "@/components/transfer-planning/TransferDrilldownModal";
import { AddToTransferModal } from "@/components/transfer-planning/AddToTransferModal";
import { buildTransferPlanningColumns } from "@/components/transfer-planning/columns";
import { useColumnVisibility } from "@/lib/hooks/useColumnVisibility";
import {
  useTransferPlanning,
  transferPlanningApi,
} from "@/lib/api/transfer-planning";
import { exportTransferPlanningToExcel } from "@/lib/utils/transfer-planning-export";
import type {
  TransferPlanningFilters,
  AlertFilterType,
  TransferPlanningItem,
} from "@/lib/types/transfer-planning";

export default function TransferPlanningPage() {
  // ── Default filters (áp dụng lần đầu vào trang + khi reset) ──
  const DEFAULT_FILTERS: TransferPlanningFilters = {
    search: "",
    alertFilter: "ALL",
    parentNames: ["Hàng thương hiệu", "Hàng thương mại"],
    middleNames: ["Nhập khẩu chính ngạch"],
    excludeTradeMarkIds: [17], // Loại trừ Boduo
    page: 1,
    limit: 25,
    sortBy: "suggestedQuantity",
    sortDirection: "desc",
  };

  // ── Filters state ──
  const [filters, setFilters] = useState<TransferPlanningFilters>(DEFAULT_FILTERS);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [drilldownItem, setDrilldownItem] = useState<{
    id: number;
    name: string;
    sku: string;
    variant: TransferDrilldownVariant;
  } | null>(null);
  const [addToTransferItem, setAddToTransferItem] = useState<TransferPlanningItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Column visibility with local storage persistence ──
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "transferPlanningColumns",
    buildTransferPlanningColumns()
  );

  // ── Data Query ──
  const { data, isLoading } = useTransferPlanning(filters);

  const items = data?.data ?? [];

  // Side panel dùng CHÍNH object item từ dữ liệu bảng (cùng nguồn backend live)
  // để đảm bảo 100% đồng nhất với cột hiển thị, tránh lệch do dữ liệu tĩnh cũ.
  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );
  const total = data?.total ?? 0;
  const summary = data?.summary;

  const handleFiltersChange = useCallback(
    (newFilters: Partial<TransferPlanningFilters>) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilters,
      }));
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleSort = useCallback((columnKey: string) => {
    setFilters((prev) => {
      if (prev.sortBy === columnKey) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === "asc" ? "desc" : "asc",
          page: 1,
        };
      }
      return {
        ...prev,
        sortBy: columnKey,
        sortDirection: "desc",
        page: 1,
      };
    });
  }, []);

  // ── Export Excel handler ──
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // Xuất toàn bộ danh sách phù hợp với filter hiện tại (không giới hạn trang)
      const allResponse = await transferPlanningApi.getPlanning({
        ...filters,
        page: 1,
        limit: 10000,
      });

      if (allResponse.data.length === 0) {
        toast.warning("Không có dữ liệu để xuất");
        return;
      }

      const count = exportTransferPlanningToExcel(
        allResponse.data,
        visibleColumns
      );
      toast.success(`Đã xuất ${count.toLocaleString("vi-VN")} dòng ra file Excel`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Không thể xuất file Excel"
      );
    } finally {
      setIsExporting(false);
    }
  }, [filters, visibleColumns]);

  return (
    <PagePermissionGuard resource="transfer_planning" action="view">
      <div className="flex h-full w-full overflow-hidden bg-gray-100">
        {/* Sidebar Filters on Left */}
        <TransferPlanningSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
          totalFiltered={total}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
          {/* Top Toolbar with Summary, Search, Columns & Export */}
          <TransferPlanningToolbar
            summary={summary}
            searchValue={filters.search || ""}
            onSearchChange={(search) => handleFiltersChange({ search, page: 1 })}
            columns={columns}
            onToggleColumn={toggleColumn}
            onExportExcel={handleExport}
            isExporting={isExporting}
          />

          {/* Table */}
          <TransferPlanningTable
            items={items}
            visibleColumns={visibleColumns}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            isLoading={isLoading}
            sortBy={filters.sortBy}
            sortDirection={filters.sortDirection}
            onSort={handleSort}
            onResetFilters={handleResetFilters}
            columnContext={{
              onOpenInTransit: (item) =>
                setDrilldownItem({
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  variant: "in-transit",
                }),
              onOpenPending: (item) =>
                setDrilldownItem({
                  id: item.id,
                  name: item.name,
                  sku: item.sku,
                  variant: "pending",
                }),
              onOpenAddToTransfer: (item) => setAddToTransferItem(item),
            }}
          />

          {/* Pagination Footer */}
          <TransferPlanningPagination
            page={filters.page || 1}
            limit={filters.limit || 25}
            total={total}
            onPageChange={(page) => handleFiltersChange({ page })}
            onLimitChange={(limit) => handleFiltersChange({ limit })}
          />
        </main>

        {/* Progressive Disclosure Slide-over Panel */}
        <TransferPlanningDetailPanel
          item={selectedItem ?? null}
          onClose={() => setSelectedItemId(null)}
        />

        {/* Drill-Down Modal (Đang chuyển / Phiếu tạm) */}
        {drilldownItem && (
          <TransferDrilldownModal
            variant={drilldownItem.variant}
            productId={drilldownItem.id}
            productName={drilldownItem.name}
            productSku={drilldownItem.sku}
            onClose={() => setDrilldownItem(null)}
          />
        )}

        {/* Add to Transfer Modal */}
        {addToTransferItem && (
          <AddToTransferModal
            item={addToTransferItem}
            onClose={() => setAddToTransferItem(null)}
          />
        )}
      </div>
    </PagePermissionGuard>
  );
}
