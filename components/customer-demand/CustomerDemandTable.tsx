"use client";

import { Fragment, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CloudDownload,
  FileUp,
  Plus,
} from "lucide-react";
import { useCustomerDemands } from "@/lib/hooks/useCustomerDemand";
import type {
  CustomerDemand,
  CustomerDemandFilters,
  CustomerDemandSortBy,
} from "@/lib/types/customer-demand";
import { CustomerDemandDetailRow } from "./CustomerDemandDetailRow";
import {
  DemandMonthChip,
  DemandStatusChip,
  formatDemandDateTime,
  formatDemandQty,
} from "./DemandUi";

interface CustomerDemandTableProps {
  filters: CustomerDemandFilters;
  onFiltersChange: (filters: CustomerDemandFilters) => void;
  onEditDemand: (demandId: number, monthId: number) => void;
  onCopyDemand: (demand: CustomerDemand, monthId: number) => void;
  onCreate: () => void;
  onImport: () => void;
  onSync: () => void;
  canCreate: boolean;
  canSyncLark: boolean;
}

const SORTABLE_COLUMNS: Partial<Record<string, CustomerDemandSortBy>> = {
  id: "id",
  customer: "customerName",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

export function CustomerDemandTable({
  filters,
  onFiltersChange,
  onEditDemand,
  onCopyDemand,
  onCreate,
  onImport,
  onSync,
  canCreate,
  canSyncLark,
}: CustomerDemandTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isLoading, isError } = useCustomerDemands(filters);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const totalPages = data?.totalPages ?? 1;
  // Số cột hiển thị của bảng Demand sau khi bỏ cột thao tác.
  const colSpan = 8;

  const patchFilters = (patch: Partial<CustomerDemandFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const toggleSort = (columnKey: string) => {
    const sortBy = SORTABLE_COLUMNS[columnKey];
    if (!sortBy) return;
    const sameColumn = filters.sortBy === sortBy;
    patchFilters({
      sortBy,
      sortOrder: sameColumn
        ? filters.sortOrder === "desc"
          ? "asc"
          : "desc"
        : sortBy === "customerName"
          ? "asc"
          : "desc",
      page: 1,
    });
  };

  return (
    <div className="mr-4 mt-4 mb-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
            Demand khách hàng
          </h2>
          <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 md:inline-flex">
            {total.toLocaleString("vi-VN")} phiếu
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canSyncLark && (
            <button
              type="button"
              onClick={onSync}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <CloudDownload className="h-4 w-4" />
              <span className="hidden xl:inline">Đồng bộ LarkBase</span>
            </button>
          )}
          {canCreate && (
            <>
              <button
                type="button"
                onClick={onImport}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                <FileUp className="h-4 w-4" />
                <span className="hidden xl:inline">Import Excel</span>
              </button>
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
                <Plus className="h-4 w-4" />
                Tạo Demand
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <SortableHead
                label="Mã phiếu"
                columnKey="id"
                filters={filters}
                onSort={toggleSort}
                className="w-[110px]"
              />
              <SortableHead
                label="Khách hàng"
                columnKey="customer"
                filters={filters}
                onSort={toggleSort}
                className="w-[220px]"
              />
              <th className="w-[140px] px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Trạng thái
              </th>
              <th className="w-[240px] px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Tháng
              </th>
              <th className="w-[100px] px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Sản phẩm
              </th>
              <th className="w-[130px] px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                Tổng đv cơ bản
              </th>
              <SortableHead
                label="Ngày tạo"
                columnKey="createdAt"
                filters={filters}
                onSort={toggleSort}
                className="w-[175px]"
              />
              <SortableHead
                label="Ngày cập nhật"
                columnKey="updatedAt"
                filters={filters}
                onSort={toggleSort}
                className="w-[175px]"
              />
              </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-16 text-center text-sm text-red-600">
                  Không tải được danh sách Demand.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-sm text-gray-400">
                  Không có phiếu Demand nào.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const expanded = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() =>
                        setExpandedId((current) =>
                          current === row.id ? null : row.id
                        )
                      }
                      className={`cursor-pointer border-b transition-colors ${
                        expanded ? "bg-brand-soft" : "hover:bg-gray-50"
                      }`}>
                      <td
                        className={`px-4 py-3 font-mono text-xs font-bold text-brand ${
                          expanded ? "border-l-2 border-t-2 border-brand" : ""
                        }`}>
                        #{row.id}
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          expanded ? "border-t-2 border-brand" : ""
                        }`}>
                        <div className="font-medium text-gray-900">
                          {row.customer.name}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-400">
                          {row.customer.code || `ID KH: ${row.customer.id}`}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          expanded ? "border-t-2 border-brand" : ""
                        }`}>
                        <RowStatus row={row} />
                      </td>
                      <td
                        className={`px-4 py-3 ${
                          expanded ? "border-t-2 border-brand" : ""
                        }`}>
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {row.months.slice(0, 4).map((month) => (
                            <DemandMonthChip
                              key={month.id}
                              month={month.month}
                              status={month.status}
                            />
                          ))}
                          {row.months.length > 4 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                              +{row.months.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-medium text-gray-700 ${
                          expanded ? "border-t-2 border-brand" : ""
                        }`}>
                        {row.totalProducts.toLocaleString("vi-VN")}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold text-gray-900 ${
                          expanded ? "border-t-2 border-brand" : ""
                        }`}>
                        {formatDemandQty(row.totalQuantityBase)}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs text-gray-500 ${
                          expanded ? "border-t-2 border-brand" : ""
                        }`}>
                        {formatDemandDateTime(row.createdAt)}
                      </td>
                      <td
                        className={`px-4 py-3 text-xs text-gray-500 ${
                          expanded ? "border-t-2 border-brand" : ""
                        }`}>
                        {formatDemandDateTime(row.updatedAt)}
                      </td>
                    </tr>
                    {expanded && (
                      <CustomerDemandDetailRow
                        demandId={row.id}
                        colSpan={colSpan}
                        onEditMonth={(monthId) =>
                          onEditDemand(row.id, monthId)
                        }
                        onCopyMonth={onCopyDemand}
                      />
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={limit}
            onChange={(event) =>
              patchFilters({ limit: Number(event.target.value), page: 1 })
            }
            className="rounded border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand">
            {[10, 20, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>

        <div className="flex items-center gap-1">
          <PagerButton
            disabled={page <= 1}
            onClick={() => patchFilters({ page: 1 })}
            label="Trang đầu">
            <ChevronsLeft className="h-4 w-4" />
          </PagerButton>
          <PagerButton
            disabled={page <= 1}
            onClick={() => patchFilters({ page: Math.max(1, page - 1) })}
            label="Trang trước">
            <ChevronLeft className="h-4 w-4" />
          </PagerButton>
          {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
            const pageNumber = Math.min(
              Math.max(page - 2 + index, index + 1),
              totalPages - (Math.min(5, totalPages) - 1 - index)
            );
            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => patchFilters({ page: pageNumber })}
                className={`h-7 w-7 rounded border text-xs font-medium transition-colors ${
                  pageNumber === page
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}>
                {pageNumber}
              </button>
            );
          })}
          <PagerButton
            disabled={page >= totalPages}
            onClick={() =>
              patchFilters({ page: Math.min(totalPages, page + 1) })
            }
            label="Trang sau">
            <ChevronRight className="h-4 w-4" />
          </PagerButton>
          <PagerButton
            disabled={page >= totalPages}
            onClick={() => patchFilters({ page: totalPages })}
            label="Trang cuối">
            <ChevronsRight className="h-4 w-4" />
          </PagerButton>
        </div>

        <span className="text-xs text-gray-400">
          {total > 0
            ? `${Math.min((page - 1) * limit + 1, total)}-${Math.min(
                page * limit,
                total
              )} / ${total.toLocaleString("vi-VN")} phiếu`
            : "0 phiếu"}
        </span>
      </div>
    </div>
  );
}

function SortableHead({
  label,
  columnKey,
  filters,
  onSort,
  className,
}: {
  label: string;
  columnKey: string;
  filters: CustomerDemandFilters;
  onSort: (columnKey: string) => void;
  className: string;
}) {
  const sortBy = SORTABLE_COLUMNS[columnKey];
  const active = sortBy && filters.sortBy === sortBy;
  return (
    <th
      className={`${className} cursor-pointer select-none px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 hover:bg-gray-100`}
      onClick={() => onSort(columnKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          filters.sortOrder === "asc" ? (
            <ArrowUp className="h-3 w-3 text-brand" />
          ) : (
            <ArrowDown className="h-3 w-3 text-brand" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-35" />
        )}
      </span>
    </th>
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
    return <DemandStatusChip status="DRAFT" label={`Chờ duyệt (${draft})`} />;
  }
  if (months.length > 0 && confirmed === months.length) {
    return (
      <DemandStatusChip
        status="CONFIRMED"
        label={`Đã duyệt (${confirmed})`}
      />
    );
  }
  if (months.length > 0 && cancelled === months.length) {
    return <DemandStatusChip status="CANCELLED" />;
  }
  return (
    <DemandStatusChip
      status="mixed"
      label={`${confirmed} duyệt · ${cancelled} hủy`}
    />
  );
}

function PagerButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  );
}
