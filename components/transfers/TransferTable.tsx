"use client";

import { useState, useEffect } from "react";
import type { Transfer } from "@/lib/api/transfers";
import { Pencil, Trash2 } from "lucide-react";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  render: (transfer: Transfer) => React.ReactNode;
}

interface TransferTableProps {
  transfers: Transfer[];
  isLoading: boolean;
  onEdit: (transfer: Transfer) => void;
  onDelete?: (id: number) => void;
}

const formatDate = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("vi-VN");
};

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN");
};

const formatMoney = (amount: number) => {
  return Number(amount).toLocaleString("vi-VN") + " đ";
};

const calculateTotalItems = (transfer: Transfer) => {
  return (
    transfer.details?.reduce(
      (sum, item) => sum + Number(item.receivedQuantity),
      0
    ) || 0
  );
};

const getStatusText = (status: number) => {
  switch (status) {
    case 1:
      return "Phiếu tạm";
    case 2:
      return "Đang chuyển";
    case 3:
      return "Đã nhận";
    case 4:
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
      return "text-blue-600 bg-blue-100";
    case 3:
      return "text-green-600 bg-green-100";
    case 4:
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    key: "code",
    label: "Mã chuyển hàng",
    visible: true,
    render: (transfer) => (
      <span className="font-medium text-blue-600">{transfer.code}</span>
    ),
  },
  {
    key: "creator",
    label: "Người tạo",
    visible: false,
    render: (transfer) => transfer.createdByName,
  },
  {
    key: "transferDate",
    label: "Ngày chuyển",
    visible: true,
    render: (transfer) => formatDateTime(transfer.transferredDate),
  },
  {
    key: "receiveDate",
    label: "Ngày nhận",
    visible: true,
    render: (transfer) => formatDateTime(transfer.receivedDate),
  },
  {
    key: "createTime",
    label: "Thời gian tạo",
    visible: false,
    render: (transfer) => formatDateTime(transfer.createdAt),
  },
  {
    key: "fromBranch",
    label: "Từ chi nhánh",
    visible: true,
    render: (transfer) => transfer.fromBranchName,
  },
  {
    key: "toBranch",
    label: "Tới chi nhánh",
    visible: true,
    render: (transfer) => transfer.toBranchName,
  },
  {
    key: "warehouse",
    label: "Kho chuyển",
    visible: false,
    render: () => "-",
  },
  {
    key: "receiveWarehouse",
    label: "Kho nhận",
    visible: false,
    render: () => "-",
  },
  // THÊM MỚI: Tổng SL chuyển
  {
    key: "totalSendQuantity",
    label: "Tổng SL chuyển",
    visible: false,
    render: (transfer) => {
      const total =
        transfer.details?.reduce(
          (sum, item) => sum + Number(item.sendQuantity),
          0
        ) || 0;
      return total.toLocaleString();
    },
  },
  {
    key: "totalTransfer",
    label: "Giá trị chuyển",
    visible: true,
    render: (transfer) => formatMoney(transfer.totalTransfer),
  },
  {
    key: "totalReceive",
    label: "Tổng SL nhận",
    visible: false,
    render: (transfer) => calculateTotalItems(transfer).toLocaleString(),
  },
  // THÊM MỚI: Giá trị nhận
  {
    key: "totalReceiveValue",
    label: "Giá trị nhận",
    visible: false,
    render: (transfer) => formatMoney(transfer.totalReceive || 0),
  },
  {
    key: "totalGoods",
    label: "Tổng số mặt hàng",
    visible: false,
    render: (transfer) => transfer.details?.length || 0,
  },
  {
    key: "note",
    label: "Ghi chú",
    visible: false,
    render: (transfer) => transfer.noteBySource || "-",
  },
  {
    key: "status",
    label: "Trạng thái",
    visible: true,
    render: (transfer) => (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
          transfer.status
        )}`}>
        {getStatusText(transfer.status)}
      </span>
    ),
  },
];

export function TransferTable({
  transfers,
  isLoading,
  onEdit,
  onDelete,
}: TransferTableProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("transferTableColumns");
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
      localStorage.setItem("transferTableColumns", JSON.stringify(columns));
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
    if (selectedIds.length === transfers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transfers.map((t) => t.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="p-4 border-b flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600"></span>
        </div>
        <div className="flex items-center gap-2 relative">
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
                    transfers.length > 0 &&
                    selectedIds.length === transfers.length
                  }
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
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
            {transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 2}
                  className="px-4 py-8 text-center text-gray-500">
                  Chưa có phiếu chuyển hàng nào
                </td>
              </tr>
            ) : (
              transfers.map((transfer) => (
                <tr
                  key={transfer.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => onEdit(transfer)}>
                  <td
                    className="px-4 py-3 sticky left-0 bg-white"
                    onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(transfer.id)}
                      onChange={() => toggleSelect(transfer.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm whitespace-nowrap">
                      {col.render(transfer)}
                    </td>
                  ))}
                  <td
                    className="px-4 py-3 text-center"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(transfer)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Sửa">
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Bạn có chắc chắn muốn xóa phiếu chuyển hàng này?"
                              )
                            ) {
                              onDelete(transfer.id);
                            }
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Xóa">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
