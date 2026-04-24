"use client";

import { useState, useEffect } from "react";
import { useReturnOrders } from "@/lib/hooks/useReturnOrders";
import { useBranchStore } from "@/lib/store/branch";
import { Plus, Settings } from "lucide-react";
import type { ReturnOrder } from "@/lib/types/return-order";
import { Can } from "../permissions/Can";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  render: (item: ReturnOrder) => React.ReactNode;
}

interface ReturnOrdersTableProps {
  filters: any;
  onCreateClick: () => void;
  onViewClick: (item: ReturnOrder) => void;
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
      return "bg-blue-100 text-blue-700";
    case 2:
      return "bg-yellow-100 text-yellow-700";
    case 3:
      return "bg-orange-100 text-orange-700";
    case 4:
      return "bg-green-100 text-green-700";
    case 5:
      return "bg-red-100 text-red-700";
    case 6:
      return "bg-purple-100 text-purple-700";
    case 7:
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Yêu cầu trả hàng";
    case 2:
      return "Nhập hàng trả";
    case 3:
      return "Yêu cầu hoàn tiền";
    case 4:
      return "Hoàn thành";
    case 5:
      return "Đã hủy";
    case 6:
      return "Đang nhập hàng (tạm)";
    case 7:
      return "Phiếu tạm (Sale)";
    default:
      return "Không xác định";
  }
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã cấn trừ nợ",
    visible: true,
    render: (item) => item.code,
  },
  {
    key: "invoiceCode",
    label: "Mã hóa đơn",
    visible: true,
    render: (item) => {
      if (item.invoice?.code) return item.invoice.code;
      const codes = [
        ...new Set((item.details || []).map((d: any) => d.invoiceCode)),
      ];
      return codes.join(", ") || "-";
    },
  },
  {
    key: "invoiceSeller",
    label: "Người bán (HĐ)",
    visible: true,
    render: (item) => item.invoice?.soldBy?.name || "-",
  },
  {
    key: "creator",
    label: "Người tạo phiếu",
    visible: true,
    render: (item) => item.creator?.name || item.createdByName || "-",
  },
  {
    key: "invoiceDate",
    label: "Thời gian bán (HĐ)",
    visible: true,
    render: (item) =>
      item.invoice?.purchaseDate
        ? formatDateTime(item.invoice.purchaseDate)
        : "-",
  },
  {
    key: "createdAt",
    label: "Thời gian tạo",
    visible: true,
    render: (item) => formatDateTime(item.createdAt),
  },
  {
    key: "customerCode",
    label: "Mã KH",
    visible: true,
    render: (item) => item.customer?.code || "-",
  },
  {
    key: "customerName",
    label: "Tên khách hàng",
    visible: true,
    render: (item) => item.customer?.name || "-",
  },
  {
    key: "branch",
    label: "Chi nhánh nhận",
    visible: true,
    render: (item) => item.branch?.name || "-",
  },
  {
    key: "receivedBy",
    label: "Người nhận trả",
    visible: false,
    render: (item) => item.confirmedByName || "-",
  },
  {
    key: "note",
    label: "Ghi chú",
    visible: false,
    render: (item) => item.note || "-",
  },
  {
    key: "invoiceTotalAmount",
    label: "Tổng tiền HĐ",
    visible: true,
    render: (item) =>
      item.invoice?.grandTotal
        ? formatMoney(Number(item.invoice.grandTotal))
        : "-",
  },
  {
    key: "totalReturnAmount",
    label: "Tiền cần trả KH",
    visible: true,
    render: (item) =>
      formatMoney(Number(item.refundAmount || item.totalReturnAmount)),
  },
  {
    key: "refundedAmount",
    label: "Đã trả cho KH",
    visible: true,
    render: (item) => formatMoney(Number(item.refundedAmount)),
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (item) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
        {getStatusText(item.status)}
      </span>
    ),
  },
];

export function ReturnOrdersTable({
  filters,
  onCreateClick,
  onViewClick,
}: ReturnOrdersTableProps) {
  const { selectedBranch } = useBranchStore();
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("returnOrderTableColumns");
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

  const { data, isLoading } = useReturnOrders({
    page,
    limit,
    search,
    branchId: selectedBranch?.id,
    ...filters,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("returnOrderTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const returnOrders = data?.data || [];
  const total = data?.total || 0;
  const visibleColumns = columns.filter((col) => col.visible);

  const toggleColumnVisibility = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <Can resource="return_orders" action="view">
      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tìm theo mã trả hàng, mã HĐ, tên KH..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border rounded-lg text-sm w-80"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColumnModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Cấu hình cột">
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onCreateClick}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
              <Plus className="w-4 h-4" />
              Tạo phiếu trả hàng
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="text-center py-8 text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : returnOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="text-center py-8 text-gray-500">
                    Không có phiếu trả hàng
                  </td>
                </tr>
              ) : (
                returnOrders.map((item: ReturnOrder) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-blue-50 cursor-pointer"
                    onClick={() => onViewClick(item)}>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
          <div className="text-sm text-gray-600">
            Tổng: {total} phiếu trả hàng
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 border rounded text-sm">
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50">
              Trước
            </button>
            <span className="text-sm">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50">
              Sau
            </button>
          </div>
        </div>

        {showColumnModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 max-h-[80vh] overflow-y-auto">
              <h3 className="font-semibold mb-4">Cấu hình cột hiển thị</h3>
              <div className="space-y-2">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumnVisibility(col.key)}
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setShowColumnModal(false)}
                className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm">
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </Can>
  );
}
