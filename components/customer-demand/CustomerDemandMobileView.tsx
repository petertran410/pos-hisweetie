"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  FileUp,
  Pencil,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useCustomerDemands } from "@/lib/hooks/useCustomerDemand";
import type {
  CustomerDemand,
  CustomerDemandFilters,
} from "@/lib/types/customer-demand";
import { CustomerDemandDetail } from "./CustomerDemandDetailRow";
import { CustomerDemandSidebar } from "./CustomerDemandSidebar";
import {
  DemandMonthChip,
  DemandStatusChip,
  formatDemandDateTime,
  formatDemandQty,
} from "./DemandUi";

interface CustomerDemandMobileViewProps {
  filters: CustomerDemandFilters;
  onFiltersChange: (filters: CustomerDemandFilters) => void;
  onEditDemand: (demandId: number, monthId: number) => void;
  onCopyDemand: (demand: CustomerDemand, monthId: number) => void;
  onCreate: () => void;
  onImport: () => void;
  onSync: () => void;
  canCreate: boolean;
  canUpdate: boolean;
  canSyncLark: boolean;
}

export function CustomerDemandMobileView({
  filters,
  onFiltersChange,
  onEditDemand,
  onCopyDemand,
  onCreate,
  onImport,
  onSync,
  canCreate,
  canUpdate,
  canSyncLark,
}: CustomerDemandMobileViewProps) {
  const { data, isLoading, isError } = useCustomerDemands(filters);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const rows = data?.data ?? [];
  const page = filters.page ?? 1;
  const totalPages = data?.totalPages ?? 1;

  const handleEdit = (row: CustomerDemand) => {
    const editableMonths = row.months.filter(
      (month) => month.status !== "CANCELLED"
    );
    if (editableMonths.length === 1) {
      onEditDemand(row.id, editableMonths[0].id);
      return;
    }
    setExpandedId(row.id);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <div className="shrink-0 border-b bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium text-gray-600">
            <SlidersHorizontal className="h-4 w-4" />
            Bộ lọc
          </button>
          <h1 className="truncate text-sm font-semibold text-gray-900">
            Demand khách hàng
          </h1>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {data?.total ?? 0}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-0.5">
          {canSyncLark && (
            <button
              type="button"
              onClick={onSync}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600">
              <CloudDownload className="h-3.5 w-3.5" />
              Đồng bộ
            </button>
          )}
          {canCreate && (
            <>
              <button
                type="button"
                onClick={onImport}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600">
                <FileUp className="h-3.5 w-3.5" />
                Import
              </button>
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white">
                <Plus className="h-3.5 w-3.5" />
                Tạo Demand
              </button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl border bg-white"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-600">
            Không tải được danh sách Demand.
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            Không có phiếu Demand nào.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <div
                    onClick={() =>
                      setExpandedId((current) =>
                        current === row.id ? null : row.id
                      )
                    }
                    className="cursor-pointer p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-brand">
                            #{row.id}
                          </span>
                          <RowStatus row={row} />
                        </div>
                        <h2 className="mt-1 truncate text-sm font-semibold text-gray-900">
                          {row.customer.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {row.customer.code || `ID KH: ${row.customer.id}`}
                        </p>
                      </div>
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEdit(row);
                          }}
                          className="rounded-lg border p-1.5 text-gray-400 hover:text-brand"
                          aria-label="Chỉnh sửa Demand">
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {row.months.slice(0, 4).map((month) => (
                        <DemandMonthChip
                          key={month.id}
                          month={month.month}
                          status={month.status}
                        />
                      ))}
                      {row.months.length > 4 && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                          +{row.months.length - 4}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-dashed pt-3">
                      <div>
                        <p className="text-[11px] text-gray-400">Sản phẩm</p>
                        <p className="font-mono text-sm font-semibold text-gray-800">
                          {row.totalProducts}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-gray-400">
                          Tổng đv cơ bản
                        </p>
                        <p className="font-mono text-sm font-semibold text-gray-900">
                          {formatDemandQty(row.totalQuantityBase)}
                        </p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400">
                      Tạo: {formatDemandDateTime(row.createdAt)}
                    </p>
                  </div>

                  {expanded && (
                    <div className="border-t bg-gray-50">
                      <CustomerDemandDetail
                        demandId={row.id}
                        onEditMonth={(monthId) =>
                          onEditDemand(row.id, monthId)
                        }
                        onCopyMonth={onCopyDemand}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t bg-white px-3 py-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() =>
            onFiltersChange({ ...filters, page: Math.max(1, page - 1) })
          }
          className="rounded-lg border p-1.5 disabled:opacity-40"
          aria-label="Trang trước">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs text-gray-500">
          {page}/{totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() =>
            onFiltersChange({
              ...filters,
              page: Math.min(totalPages, page + 1),
            })
          }
          className="rounded-lg border p-1.5 disabled:opacity-40"
          aria-label="Trang sau">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {filtersOpen && (
        <div
          className="fixed inset-0 z-[70] flex bg-black/30"
          onClick={() => setFiltersOpen(false)}>
          <div
            className="h-full max-w-[85vw] overflow-y-auto bg-gray-50 p-1"
            onClick={(event) => event.stopPropagation()}>
            <CustomerDemandSidebar
              filters={filters}
              onFiltersChange={onFiltersChange}
              onClose={() => setFiltersOpen(false)}
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="fixed right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-gray-500 shadow-lg"
            aria-label="Đóng bộ lọc">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function RowStatus({ row }: { row: CustomerDemand }) {
  const months = row.months ?? [];
  const draft = months.filter((month) => month.status === "DRAFT").length;
  const confirmed = months.filter(
    (month) => month.status === "CONFIRMED"
  ).length;
  const cancelled = months.filter(
    (month) => month.status === "CANCELLED"
  ).length;

  if (draft > 0) {
    return (
      <DemandStatusChip status="DRAFT" label={`Chưa cập nhật (${draft})`} />
    );
  }
  if (months.length > 0 && confirmed === months.length) {
    return (
      <DemandStatusChip
        status="CONFIRMED"
        label={`Hoàn thành (${confirmed})`}
      />
    );
  }
  if (months.length > 0 && cancelled === months.length) {
    return <DemandStatusChip status="CANCELLED" />;
  }
  return <DemandStatusChip status="mixed" />;
}
