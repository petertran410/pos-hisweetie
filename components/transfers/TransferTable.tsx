"use client";

import type { Transfer } from "@/lib/api/transfers";

interface TransferTableProps {
  transfers: Transfer[];
  isLoading: boolean;
  onEdit: (transfer: Transfer) => void;
}

export function TransferTable({
  transfers,
  isLoading,
  onEdit,
}: TransferTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return "Phiếu tạm";
      case 2:
        return "Đang chuyển";
      case 3:
        return "Đã nhận";
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
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Mã chuyển hàng
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Ngày chuyển
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Ngày nhận
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Từ chi nhánh
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Tới chi nhánh
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium">
              Giá trị chuyển
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {transfers.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                Chưa có phiếu chuyển hàng nào
              </td>
            </tr>
          ) : (
            transfers.map((transfer) => (
              <tr key={transfer.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{transfer.code}</td>
                <td className="px-4 py-3 text-sm">
                  {transfer.transferredDate
                    ? new Date(transfer.transferredDate).toLocaleString("vi-VN")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {transfer.receivedDate
                    ? new Date(transfer.receivedDate).toLocaleString("vi-VN")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm">{transfer.fromBranchName}</td>
                <td className="px-4 py-3 text-sm">{transfer.toBranchName}</td>
                <td className="px-4 py-3 text-sm text-right">
                  {Number(transfer.totalTransfer).toLocaleString()} đ
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      transfer.status
                    )}`}>
                    {getStatusText(transfer.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onEdit(transfer)}
                    className="text-blue-600 hover:text-blue-800 text-sm">
                    Xem
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
