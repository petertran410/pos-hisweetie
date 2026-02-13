"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { PackingSlip } from "@/lib/types/packing-slip";

interface PackingSlipsTableProps {
  packingSlips: PackingSlip[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onCreateClick: () => void;
  onEditClick: (packingSlip: PackingSlip) => void;
  onDeleteClick: (id: number) => void;
}

export function PackingSlipsTable({
  packingSlips,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: PackingSlipsTableProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredSlips = packingSlips.filter((slip) =>
    slip.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Báo đơn</h1>
          <input
            type="text"
            placeholder="Tìm theo mã báo đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 text-md w-80"
          />
        </div>
        <button
          onClick={onCreateClick}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          + Tạo báo đơn
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Đang tải...</p>
          </div>
        ) : filteredSlips.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Không có báo đơn nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                    Mã báo đơn
                  </th>
                  <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                    Chi nhánh
                  </th>
                  <th className="px-4 py-3 text-center text-md font-semibold text-gray-700">
                    Số kiện
                  </th>
                  <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                    Hóa đơn
                  </th>
                  <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                    Thanh toán
                  </th>
                  <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                    Phí
                  </th>
                  <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                    Người tạo
                  </th>
                  <th className="px-4 py-3 text-center text-md font-semibold text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSlips.map((slip) => (
                  <tr
                    key={slip.id}
                    className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === slip.id ? null : slip.id)
                        }
                        className="text-blue-600 hover:underline font-medium">
                        {slip.code}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {slip.branch?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {slip.numberOfPackages}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {slip.invoices?.length || 0} hóa đơn
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {slip.paymentMethod === "cash" ? (
                        <span>
                          Tiền mặt - {formatCurrency(slip.cashAmount)}
                        </span>
                      ) : (
                        <span>Chuyển khoản</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatCurrency(
                        (slip.hasFeeGuiBen ? slip.feeGuiBen : 0) +
                          (slip.hasFeeGrab ? slip.feeGrab : 0) +
                          (slip.hasCuocGuiHang ? slip.cuocGuiHang : 0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {slip.creator?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEditClick(slip)}
                          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                          Sửa
                        </button>
                        <button
                          onClick={() => {
                            if (
                              confirm("Bạn có chắc chắn muốn xóa báo đơn này?")
                            ) {
                              onDeleteClick(slip.id);
                            }
                          }}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border-t p-4 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-md text-gray-600">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
            / {total} báo đơn
          </span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value));
              onPageChange(1);
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
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            ←
          </button>
          <span className="text-md">
            Trang {page} / {Math.ceil(total / limit) || 1}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
