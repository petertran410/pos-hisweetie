"use client";

import { useState, useEffect, Fragment } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { useBranchStore } from "@/lib/store/branch";
import { Plus, Settings } from "lucide-react";
import type { Order } from "@/lib/types/order";
import { OrderDetailRow } from "./OrderDetailRow";

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
  return new Intl.NumberFormat("en-US").format(value);
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "bg-yellow-100 text-yellow-700";
    case 2:
      return "bg-blue-100 text-blue-700";
    case 3:
      return "bg-green-100 text-green-700";
    case 4:
      return "bg-red-100 text-red-700";
    case 5:
      return "bg-teal-100 text-teal-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Phiếu tạm";
    case 2:
      return "Đang giao hàng";
    case 3:
      return "Hoàn thành";
    case 4:
      return "Hủy";
    case 5:
      return "Đã xác nhận";
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
    key: "invoiceCode",
    label: "Mã hóa đơn",
    visible: true,
    render: (order) => order.invoiceCode || "-",
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
    key: "totalAmount",
    label: "Tổng tiền hàng",
    visible: false,
    render: (order) => formatMoney(Number(order.totalAmount)),
  },
  {
    key: "discount",
    label: "Giảm giá",
    visible: false,
    render: (order) => formatMoney(Number(order.discount)),
  },
  {
    key: "discountRatio",
    label: "Phần trăm giảm giá",
    visible: false,
    render: (order) => <span>{formatMoney(Number(order.discountRatio))}%</span>,
  },
  {
    key: "grandTotal",
    label: "Tổng sau giảm giá",
    visible: false,
    render: (order) => formatMoney(Number(order.grandTotal)),
  },
  {
    key: "otherFees",
    label: "Thu khác",
    visible: false,
    render: () => "-",
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
    key: "phone",
    label: "Điện thoại",
    visible: false,
    render: (order) =>
      order.customer?.contactNumber || order.customer?.phone || "-",
  },
  {
    key: "address",
    label: "Địa chỉ",
    visible: false,
    render: (order) => order.customer?.address || "-",
  },
  {
    key: "area",
    label: "Khu vực",
    visible: false,
    render: (order) =>
      order.delivery?.locationName || order.customer?.cityName || "-",
  },
  {
    key: "ward",
    label: "Phường/Xã",
    visible: false,
    render: (order) =>
      order.delivery?.wardName || order.customer?.wardName || "-",
  },
  {
    key: "deliveryPartner",
    label: "Đối tác giao hàng",
    visible: false,
    render: (order) => order.delivery?.partnerDelivery?.name || "-",
  },
  {
    key: "receiver",
    label: "Người nhận đặt",
    visible: false,
    render: (order) => order.delivery?.receiver || "-",
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    render: (order) => order.soldBy?.name || order.creator?.name || "-",
  },
  {
    key: "salesChannel",
    label: "Kênh bán",
    visible: false,
    render: (order) => order.saleChannel?.name || "Khác",
  },
  {
    key: "notes",
    label: "Ghi chú",
    visible: false,
    render: (order) => order.description || "-",
  },
  {
    key: "waitingDays",
    label: "Số ngày chờ",
    visible: false,
    render: (order) => {
      if (!order.orderDate) return "-";
      const orderDate = new Date(order.orderDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    },
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (order) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
          order.status
        )}`}>
        {getStatusText(order.status)}
      </span>
    ),
  },
];

export function OrdersTable({ filters, onCreateClick }: OrdersTableProps) {
  const { selectedBranch } = useBranchStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
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

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[500px]">
          <h2 className="text-xl font-semibold w-[150px]">Đơn hàng</h2>
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-md flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Đặt hàng
          </button>
          <button
            onClick={() => setShowColumnModal(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Cột hiển thị
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-md">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.length === orders.length && orders.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 3}
                  className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 3}
                  className="px-6 py-8 text-center text-gray-500">
                  Chưa có đơn đặt hàng nào
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <Fragment key={order.id}>
                  <tr
                    className={`border-b cursor-pointer ${
                      expandedOrderId === order.id ? "" : ""
                    }`}
                    onClick={() => toggleExpand(order.id)}>
                    <td
                      className="px-6 py-3 sticky left-0 bg-white"
                      onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className="px-6 py-3 text-md whitespace-nowrap">
                        {col.render(order)}
                      </td>
                    ))}
                  </tr>
                  {expandedOrderId === order.id && (
                    <OrderDetailRow
                      orderId={order.id}
                      colSpan={visibleColumns.length + 1}
                    />
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="text-md text-gray-600">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
            / {total} đơn
          </span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-md">
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            ←
          </button>
          <span className="text-md">
            Trang {page} / {Math.ceil(total / limit) || 1}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            →
          </button>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tùy chỉnh cột hiển thị</h3>
              <button
                onClick={() => setShowColumnModal(false)}
                className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="cursor-pointer"
                  />
                  <span className="text-md">{col.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
