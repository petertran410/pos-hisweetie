"use client";

import { useState, useEffect } from "react";
import type { Destruction } from "@/lib/api/destructions";
import { formatDate, formatCurrency } from "../../lib/utils";
import { Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DestructionDetailRow } from "./DestructionDetailRow";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  render: (destruction: Destruction) => React.ReactNode;
}

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

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã xuất hủy",
    visible: true,
    render: (destruction) => (
      <span className="font-medium text-blue-600">{destruction.code}</span>
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
}: DestructionsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedDestructionId, setExpandedDestructionId] = useState<
    number | null
  >(null);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("destructionTableColumns");
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedColumns.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("destructionTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const visibleColumns = columns.filter((col) => col.visible);

  const toggleColumnVisibility = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

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

  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[500px]">
          <h2 className="text-xl font-semibold w-[150px]">Xuất hủy</h2>
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng..."
            className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => router.push("/san-pham/xuat-huy/new")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-md flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tạo Xuất Hủy
          </button>

          <button
            onClick={() => setShowColumnModal(!showColumnModal)}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Cột hiển thị
          </button>
          {showColumnModal && (
            <div className="absolute right-0 top-full mt-2 bg-white border rounded shadow-lg z-50 p-4 w-64 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Hiển thị cột</h3>
                <button
                  onClick={() => setShowColumnModal(false)}
                  className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.key)}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-md" style={{ minWidth: "max-content" }}>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left sticky left-0 bg-gray-50">
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
                  className="px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {destructions.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 3}
                  className="px-4 py-8 text-center text-gray-500">
                  Chưa có phiếu xuất hủy nào
                </td>
              </tr>
            ) : (
              destructions.map((destruction) => (
                <>
                  <tr
                    key={destruction.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleExpand(destruction.id)}>
                    <td
                      className="px-4 py-3 sticky left-0 bg-white"
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
                        className="px-4 py-3 text-md whitespace-nowrap">
                        {col.render(destruction)}
                      </td>
                    ))}
                  </tr>
                  {expandedDestructionId === destruction.id && (
                    <tr>
                      <td
                        colSpan={visibleColumns.length + 3}
                        className="px-6 py-6 bg-gray-50">
                        <DestructionDetailRow
                          destruction={destruction}
                          onClose={() => setExpandedDestructionId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm">
            <option value={15}>15 dòng</option>
            <option value={30}>30 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
          <span className="text-sm text-gray-600">
            Tổng cộng: {total} bản ghi
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
