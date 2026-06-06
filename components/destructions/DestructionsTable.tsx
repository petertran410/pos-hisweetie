"use client";

import { Fragment } from "react";
import { useState } from "react";
import type { Destruction } from "@/lib/api/destructions";
import { formatCurrency } from "../../lib/utils";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DestructionDetailRow } from "./DestructionDetailRow";
import { CodeLink } from "@/components/shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

interface DestructionsTableProps {
  destructions: Destruction[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEdit: (destruction: Destruction) => void;
  onDelete?: (id: number) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Phiếu tạm";
    case 2:
      return "Hoàn thành";
    case 3:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "text-gray-600 bg-gray-100";
    case 2:
      return "text-green-600 bg-green-100";
    case 3:
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const DEFAULT_COLUMNS: ColumnConfig<Destruction>[] = [
  {
    key: "code",
    label: "Mã xuất hủy",
    visible: true,
    render: (destruction) => (
      <CodeLink entity="destruction" code={destruction.code} />
    ),
  },
  {
    key: "totalValue",
    label: "Tổng giá trị hủy",
    visible: true,
    render: (destruction) => formatCurrency(Number(destruction.totalValue)),
  },
  {
    key: "destructionDate",
    label: "Thời gian",
    visible: true,
    render: (destruction) =>
      destruction.destructionDate
        ? new Date(destruction.destructionDate).toLocaleString("vi-VN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        : "-",
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: true,
    render: (destruction) =>
      new Date(destruction.createdAt).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
  },
  {
    key: "updateTime",
    label: "Thời gian cập nhật",
    visible: true,
    render: (destruction) =>
      new Date(destruction.updatedAt).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
  },
  {
    key: "branch",
    label: "Chi nhánh",
    visible: true,
    render: (destruction) => destruction.branchName,
  },
  {
    key: "creator",
    label: "Người xuất hủy",
    visible: true,
    render: (destruction) => destruction.createdByName,
  },
  {
    key: "creatorId",
    label: "Người tạo",
    visible: true,
    render: (destruction) => destruction.createdByName,
  },
  {
    key: "note",
    label: "Ghi chú",
    visible: false,
    render: (destruction) => destruction.note || "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (destruction) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
          destruction.status
        )}`}>
        {getStatusText(destruction.status)}
      </span>
    ),
  },
];

export function DestructionsTable({
  destructions,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onEdit,
  onDelete,
  searchValue,
  onSearchChange,
}: DestructionsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedDestructionId, setExpandedDestructionId] = useState<
    number | null
  >(null);

  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "destructionTableColumns",
    DEFAULT_COLUMNS
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === destructions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(destructions.map((d) => d.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (destructionId: number) => {
    setExpandedDestructionId((prev: any) =>
      prev === destructionId ? null : destructionId
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const colSpan = visibleColumns.length + 2; // checkbox + chevron

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      {/* ── Toolbar ── */}
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Xuất hủy
          </h2>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push("/san-pham/xuat-huy/new")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Tạo Xuất Hủy
          </button>

          <ColumnToggle columns={columns} onToggle={toggleColumn} />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm" style={{ minWidth: "max-content" }}>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 text-left w-10 sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    destructions.length > 0 &&
                    selectedIds.length === destructions.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : destructions.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Chưa có phiếu xuất hủy nào</div>
                </td>
              </tr>
            ) : (
              destructions.map((destruction) => (
                <Fragment key={destruction.id}>
                  <tr
                    className={`cursor-pointer transition-colors ${
                      expandedDestructionId === destruction.id
                        ? "bg-blue-50"
                        : "border-b hover:bg-gray-50"
                    }`}
                    onClick={() => toggleExpand(destruction.id)}>
                    <td
                      className={`px-4 py-2.5 sticky left-0 z-10 ${
                        expandedDestructionId === destruction.id
                          ? "bg-blue-50 border-t-2 border-l-2 border-blue-500"
                          : "bg-white"
                      }`}
                      onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(destruction.id)}
                        onChange={() => toggleSelect(destruction.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-sm whitespace-nowrap ${
                          expandedDestructionId === destruction.id
                            ? "border-t-2 border-blue-500"
                            : ""
                        }`}>
                        {col.render(destruction)}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-2.5 ${
                        expandedDestructionId === destruction.id
                          ? "border-t-2 border-r-2 border-blue-500"
                          : ""
                      }`}>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedDestructionId === destruction.id
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </td>
                  </tr>
                  {expandedDestructionId === destruction.id && (
                    <DestructionDetailRow
                      destructionId={destruction.id}
                      colSpan={colSpan}
                      onClose={() => setExpandedDestructionId(null)}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            {[15, 30, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.min(
              Math.max(page - 2 + i, i + 1),
              totalPages - (Math.min(5, totalPages) - 1 - i)
            );
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 text-xs rounded border font-medium transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                {p}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs text-gray-400">
          Trang {page}/{totalPages}
          {total > 0 ? ` · ${total.toLocaleString("vi-VN")} phiếu` : ""}
        </span>
      </div>
    </div>
  );
}
