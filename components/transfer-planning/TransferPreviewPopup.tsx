"use client";

import React from "react";
import { X, Loader2 } from "lucide-react";
import { useTransfer } from "@/lib/hooks/useTransfers";

const STATUS_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-green-100 text-green-700",
  4: "bg-red-100 text-red-700",
};

const STATUS_TEXT: Record<number, string> = {
  1: "Phiếu tạm",
  2: "Đang chuyển",
  3: "Đã nhận",
  4: "Đã hủy",
};

const formatDateTime = (date?: string) =>
  date ? new Date(date).toLocaleString("vi-VN") : "-";

const formatMoney = (amount: number) =>
  Number(amount).toLocaleString("vi-VN") + " đ";

interface TransferPreviewPopupProps {
  transferId: number;
  onClose: () => void;
}

export function TransferPreviewPopup({
  transferId,
  onClose,
}: TransferPreviewPopupProps) {
  const { data: transfer, isLoading, isError } = useTransfer(transferId);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Popup content */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 shrink-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          ) : isError || !transfer ? (
            <span className="text-sm font-medium text-red-600">
              Không thể tải thông tin phiếu
            </span>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-bold text-brand truncate">
                {transfer.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  STATUS_COLOR[transfer.status] || "bg-gray-100 text-gray-700"
                }`}>
                {STATUS_TEXT[transfer.status] || "-"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Đang tải chi tiết phiếu...</span>
            </div>
          ) : isError || !transfer ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <span className="text-sm">
                Phiếu chuyển hàng không tồn tại hoặc đã bị xóa.
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chiều chuyển */}
              <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-gray-50 border border-gray-200">
                <span className="font-medium text-gray-800">
                  {transfer.fromBranchName}
                </span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-gray-800">
                  {transfer.toBranchName}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Người tạo</label>
                  <span className="text-gray-900 font-medium">
                    {transfer.createdByName || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Ngày tạo</label>
                  <span className="text-gray-900">
                    {formatDateTime(transfer.createdAt)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Ngày chuyển</label>
                  <span className="text-gray-900">
                    {formatDateTime(transfer.transferredDate)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-xs text-gray-500">Giá trị chuyển</label>
                  <span className="text-gray-900 font-medium">
                    {formatMoney(transfer.totalTransfer || 0)}
                  </span>
                </div>
              </div>

              {/* Ghi chú */}
              {transfer.noteBySource && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <label className="text-xs text-gray-500 block mb-1">
                    Ghi chú
                  </label>
                  <span className="text-sm text-gray-800">
                    {transfer.noteBySource}
                  </span>
                </div>
              )}

              {/* Bảng sản phẩm */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Mã hàng
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Tên hàng
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        SL
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {transfer.details?.length ? (
                      transfer.details.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono text-xs">
                            {detail.productCode || "-"}
                          </td>
                          <td className="px-3 py-2 text-gray-900 max-w-[160px]">
                            <div className="truncate">{detail.productName}</div>
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900">
                            {Number(detail.sendQuantity).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">
                            {formatMoney(
                              Number(detail.sendQuantity) *
                                Number(detail.sendPrice)
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-6 text-center text-gray-400 text-sm">
                          Không có sản phẩm
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {transfer.details?.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td
                          colSpan={3}
                          className="px-3 py-2 text-xs font-semibold text-gray-600">
                          Tổng ({transfer.details.length} mặt hàng)
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-right text-gray-900">
                          {formatMoney(transfer.totalTransfer || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
