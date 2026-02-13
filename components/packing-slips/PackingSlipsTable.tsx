"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { PackingSlip } from "@/lib/types/packing-slip";
import { X, Plus, Settings } from "lucide-react";

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
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const filteredSlips = packingSlips.filter((slip) =>
    slip.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[500px]">
          <h2 className="text-xl font-semibold w-[150px]">Báo đơn</h2>
          <input
            type="text"
            placeholder="Tìm theo mã báo đơn..."
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
            Tạo báo đơn
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-md">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                Mã báo đơn
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                Chi nhánh
              </th>
              <th className="px-6 py-3 text-center font-medium text-gray-700 whitespace-nowrap">
                Số kiện
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                Hóa đơn
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                Thanh toán
              </th>
              <th className="px-6 py-3 text-right font-medium text-gray-700 whitespace-nowrap">
                Phí gửi bến
              </th>
              <th className="px-6 py-3 text-right font-medium text-gray-700 whitespace-nowrap">
                Phí Grab
              </th>
              <th className="px-6 py-3 text-right font-medium text-gray-700 whitespace-nowrap">
                Cước gửi hàng
              </th>
              <th className="px-6 py-3 text-center font-medium text-gray-700 whitespace-nowrap">
                Hình ảnh
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-700 whitespace-nowrap">
                Người tạo
              </th>
              <th className="px-6 py-3 text-center font-medium text-gray-700 whitespace-nowrap">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredSlips.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-6 py-8 text-center text-gray-500">
                  Không có báo đơn nào
                </td>
              </tr>
            ) : (
              filteredSlips.map((slip) => (
                <tr key={slip.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3 text-md whitespace-nowrap">
                    <span className="text-blue-600 font-medium">
                      {slip.code}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-md whitespace-nowrap">
                    {slip.branch?.name || "-"}
                  </td>
                  <td className="px-6 py-3 text-md text-center whitespace-nowrap">
                    {slip.numberOfPackages}
                  </td>
                  <td className="px-6 py-3 text-md break-words w-[150px]">
                    {slip.invoices
                      ?.map((invoice) => invoice.invoice?.code)
                      .join(" | ") || "-"}
                  </td>
                  <td className="px-6 py-3 text-md">
                    {slip.paymentMethod === "cash" ? (
                      <span>Tiền mặt - {formatCurrency(slip.cashAmount)}</span>
                    ) : (
                      <span>Chuyển khoản</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-md text-right whitespace-nowrap">
                    {slip.hasFeeGuiBen ? formatCurrency(slip.feeGuiBen) : "-"}
                  </td>
                  <td className="px-6 py-3 text-md text-right whitespace-nowrap">
                    {slip.hasFeeGrab ? formatCurrency(slip.feeGrab) : "-"}
                  </td>
                  <td className="px-6 py-3 text-md text-right whitespace-nowrap">
                    {slip.hasCuocGuiHang
                      ? formatCurrency(slip.cuocGuiHang)
                      : "-"}
                  </td>
                  <td className="px-6 py-3 text-md text-center whitespace-nowrap">
                    {slip.images && slip.images.length > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        {slip.images.slice(0, 3).map((img, index) => (
                          <button
                            key={index}
                            onClick={() => setViewingImage(img.imageUrl)}
                            className="w-10 h-10 rounded border overflow-hidden hover:ring-2 hover:ring-blue-500">
                            <img
                              src={img.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                        {slip.images.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{slip.images.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-md whitespace-nowrap">
                    {slip.creator?.name || "-"}
                  </td>
                  <td className="px-6 py-3 text-md text-center whitespace-nowrap">
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
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

      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            <img
              src={viewingImage}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
