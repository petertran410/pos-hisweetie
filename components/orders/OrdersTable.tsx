"use client";

import { useState, useEffect } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useBranchStore } from "@/lib/store/branch";
import { Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { Order } from "@/lib/types/order";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  render: (order: Order) => React.ReactNode;
}

interface OrdersTableProps {
  filters: any;
  onCreateClick: () => void;
  onEditClick: (order: Order) => void;
}

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("vi-VN").format(value);
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "processing":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "pending":
      return "Phiếu tạm";
    case "processing":
      return "Đang giao hàng";
    case "completed":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã đặt hàng",
    visible: true,
    render: (order) => order.code,
  },
  {
    key: "orderDate",
    label: "Thời gian",
    visible: true,
    render: (order) => formatDateTime(order.orderDate),
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: true,
    render: (order) => formatDateTime(order.createdAt),
  },
  {
    key: "updateDate",
    label: "Ngày cập nhật",
    visible: false,
    render: (order) => formatDateTime(order.updatedAt),
  },
  {
    key: "customer",
    label: "Khách hàng",
    visible: true,
    render: (order) => order.customer?.name || "Khách vãng lai",
  },
  {
    key: "customerDebt",
    label: "Khách cần trả",
    visible: true,
    render: (order) => formatMoney(Number(order.grandTotal)),
  },
  {
    key: "customerPaid",
    label: "Khách đã trả",
    visible: true,
    render: (order) => formatMoney(Number(order.paidAmount)),
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    render: (order) => order.soldBy?.name || "-",
  },
  {
    key: "receiver",
    label: "Người nhận đặt",
    visible: false,
    render: () => "-",
  },
  {
    key: "salesChannel",
    label: "Kênh bán",
    visible: false,
    render: () => "Khác",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (order) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
          order.orderStatus
        )}`}>
        {getStatusText(order.orderStatus)}
      </span>
    ),
  },
];

export function OrdersTable({
  filters,
  onCreateClick,
  onEditClick,
}: OrdersTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orderTableColumns");
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

  const { data, isLoading } = useOrders({
    page,
    limit,
    search,
    branchId: selectedBranch?.id,
    ...filters,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orderTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const orders = data?.data || [];
  const total = data?.total || 0;
  const visibleColumns = columns.filter((col) => col.visible);

  const toggleColumnVisibility = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Đặt hàng
          </button>
          <input
            type="text"
            placeholder="Theo mã phiếu đặt"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-64 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 relative">
          <button className="px-3 py-2 border rounded hover:bg-gray-50 text-sm">
            Góp đơn
          </button>
          <button className="px-3 py-2 border rounded hover:bg-gray-50 text-sm">
            ...
          </button>
          <button
            onClick={() => setShowColumnModal(!showColumnModal)}
            className="px-3 py-2 border rounded hover:bg-gray-50 text-sm">
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
                  <label key={col.key} className="flex items-center gap-2">
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
          <button className="px-3 py-2 border rounded hover:bg-gray-50 text-sm">
            ⚙
          </button>
          <button className="px-3 py-2 border rounded hover:bg-gray-50 text-sm">
            ❓
          </button>
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            Tổng khách cần trả: <strong>{formatMoney(36061491937)}</strong>
          </span>
          <span className="text-gray-600">
            Tổng khách đã trả: <strong>{formatMoney(12684189378)}</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full" style={{ minWidth: "max-content" }}>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    orders.length > 0 && selectedIds.length === orders.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-center sticky left-12 bg-gray-50">
                ⭐
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 3}
                  className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 3}
                  className="px-4 py-8 text-center text-gray-500">
                  Chưa có đơn đặt hàng nào
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => onEditClick(order)}>
                  <td
                    className="px-4 py-3 sticky left-0 bg-white"
                    onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td
                    className="px-4 py-3 text-center sticky left-12 bg-white"
                    onClick={(e) => e.stopPropagation()}>
                    ⭐
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm whitespace-nowrap">
                      {col.render(order)}
                    </td>
                  ))}
                  <td
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEditClick(order)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Sửa">
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
            / {total} đơn
          </span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm">
            <option value="15">15 / trang</option>
            <option value="30">30 / trang</option>
            <option value="50">50 / trang</option>
            <option value="100">100 / trang</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            ←
          </button>
          <span className="text-sm">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
