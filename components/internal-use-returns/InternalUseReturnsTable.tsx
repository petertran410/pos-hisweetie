"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Loader2, Plus } from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";
import { useAuthStore } from "@/lib/store/auth";
import { API_URL } from "@/lib/config/api";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useCan } from "@/lib/hooks/useCan";
import { CodeLink } from "@/components/shared/CodeLink";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import { useInternalUseReturns } from "@/lib/hooks/useInternalUseReturns";
import type { InternalUseReturnQuery } from "@/lib/api/internal-use-returns";
import {
  INTERNAL_USE_RETURN_STATUS_LABELS,
  type InternalUseReturn,
} from "@/lib/types/internal-use-return";

interface Props {
  filters: InternalUseReturnQuery;
  onFiltersChange: (filters: InternalUseReturnQuery) => void;
  onCreateClick: () => void;
  onViewClick: (item: InternalUseReturn) => void;
  initialSearch?: string;
}

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString("vi-VN") : "-";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 4,
  }).format(Number(value) || 0);

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "bg-blue-100 text-blue-700";
    case 2:
      return "bg-green-100 text-green-700";
    case 3:
      return "bg-red-100 text-red-700";
    case 4:
      return "bg-orange-100 text-orange-700";
    case 5:
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const DEFAULT_COLUMNS: ColumnConfig<InternalUseReturn>[] = [
  {
    key: "code",
    label: "Mã trả hàng",
    visible: true,
    render: (item) => <CodeLink entity="internal-use-return" code={item.code} />,
  },
  {
    key: "internalUseCode",
    label: "Mã phiếu xuất",
    visible: true,
    render: (item) => (
      <CodeLink entity="internal-use" code={item.internalUse?.code} />
    ),
  },
  {
    key: "creator",
    label: "Người tạo phiếu",
    visible: true,
    render: (item) => item.creator?.name || item.createdByName || "-",
  },
  {
    key: "createdAt",
    label: "Thời gian tạo",
    visible: true,
    render: (item) => formatDateTime(item.createdAt),
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    render: (item) => item.branch?.name || "-",
  },
  {
    key: "totalRequestQuantity",
    label: "SL yêu cầu trả",
    visible: true,
    render: (item) => formatNumber(item.totalRequestQuantity),
  },
  {
    key: "totalConfirmedQuantity",
    label: "SL thực nhận",
    visible: true,
    render: (item) => formatNumber(item.totalConfirmedQuantity),
  },
  {
    key: "note",
    label: "Ghi chú",
    visible: false,
    render: (item) => item.note || "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (item) => (
      <span
        className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(
          item.status
        )}`}>
        {INTERNAL_USE_RETURN_STATUS_LABELS[item.status] || "Không xác định"}
      </span>
    ),
  },
];

export function InternalUseReturnsTable({
  filters,
  onFiltersChange,
  onCreateClick,
  onViewClick,
  initialSearch,
}: Props) {
  const { selectedBranch } = useBranchStore();
  const { token } = useAuthStore();
  const canCreate = useCan("internal-use-returns", "create");
  const [search, setSearch] = useState(initialSearch ?? filters.search ?? "");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const { columns, toggleColumn } = useColumnVisibility(
    "internalUseReturnTableColumns",
    DEFAULT_COLUMNS
  );
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible),
    [columns]
  );

  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExportMenu]);

  const page = filters.page || 1;
  const limit = filters.limit || 15;

  const query = {
    ...filters,
    page,
    limit,
    search: search || undefined,
    branchId: filters.branchId ?? selectedBranch?.id,
  };
  const { data, isLoading } = useInternalUseReturns(query);
  const items = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const updateQuery = (patch: Partial<InternalUseReturnQuery>) => {
    const next = { ...filters, ...patch, page: 1, limit };
    onFiltersChange(next);
  };

  const buildExportQuery = () => {
    const params = new URLSearchParams();
    const exportFilters = {
      ...filters,
      search: search || undefined,
      branchId: filters.branchId ?? selectedBranch?.id,
    };
    Object.entries(exportFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      params.set(key, Array.isArray(value) ? value.join(",") : String(value));
    });
    return params.toString();
  };

  const exportToFile = async (detail: boolean) => {
    const endpoint = detail ? "export-detail" : "export";
    const response = await fetch(
      `${API_URL}/internal-use-returns/${endpoint}?${buildExportQuery()}`,
      {
        headers: {
          Authorization: `Bearer ${token || ""}`,
          ...(selectedBranch?.id
            ? { "X-Branch-Id": String(selectedBranch.id) }
            : {}),
        },
      }
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = detail
      ? "TraHangXuatDungNoiBo_ChiTiet.xlsx"
      : "TraHangXuatDungNoiBo.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <PermissionGate resource="internal-use-returns" action="view">
      <div className="mt-4 mr-4 mb-4 flex min-w-0 flex-1 flex-col overflow-y-auto rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b bg-white p-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              type="text"
              placeholder="Tìm theo mã trả hàng, mã phiếu xuất..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                updateQuery({ search: event.target.value });
              }}
              className="w-80 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <ColumnToggle
              columns={columns}
              onToggle={toggleColumn}
            />
            <PermissionGate resource="internal-use-returns" action="export">
              <div ref={exportMenuRef} className="relative">
                <button
                  onClick={() => setShowExportMenu((open) => !open)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  <Download className="h-4 w-4" />
                  Xuất file
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportToFile(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-soft">
                      Xuất tổng quan
                    </button>
                    <button
                      onClick={() => {
                        setShowExportMenu(false);
                        exportToFile(true);
                      }}
                      className="w-full border-t border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:bg-brand-soft">
                      Xuất chi tiết
                    </button>
                  </div>
                )}
              </div>
            </PermissionGate>
            {canCreate && (
              <button
                onClick={onCreateClick}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                <Plus className="h-4 w-4" />
                Tạo phiếu trả hàng
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="py-8 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải...
                    </span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="py-8 text-center text-gray-500">
                    Không có phiếu trả xuất dùng nội bộ
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b hover:bg-brand-soft"
                    onClick={() => onViewClick(item)}>
                    {visibleColumns.map((column) => (
                      <td
                        key={column.key}
                        className="whitespace-nowrap px-4 py-3">
                        {column.render(item)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t bg-white px-4 py-3">
          <div className="text-sm text-gray-600">
            Tổng: {total} phiếu trả hàng
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);
                updateQuery({ limit: nextLimit });
              }}
              className="rounded border px-2 py-1 text-sm">
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <button
              onClick={() => {
                const nextPage = Math.max(1, page - 1);
                onFiltersChange({ ...filters, page: nextPage, limit });
              }}
              disabled={page === 1}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50">
              Trước
            </button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => {
                const nextPage = Math.min(totalPages, page + 1);
                onFiltersChange({ ...filters, page: nextPage, limit });
              }}
              disabled={page >= totalPages}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50">
              Sau
            </button>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
