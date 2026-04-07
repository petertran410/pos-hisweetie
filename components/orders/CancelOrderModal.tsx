"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cancelPayments: boolean) => void;
  hasPayments: boolean;
  orderCode: string;
  totalPayments: number;
}

export function CancelOrderModal({
  isOpen,
  onClose,
  onConfirm,
  hasPayments,
  orderCode,
  totalPayments,
}: CancelOrderModalProps) {
  const [cancelPayments, setCancelPayments] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(cancelPayments);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Xác nhận hủy đơn hàng</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Bạn có chắc chắn muốn hủy đơn hàng{" "}
            <span className="font-semibold">{orderCode}</span>?
          </p>

          {hasPayments && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 font-medium mb-3">
                Đơn hàng này có {totalPayments} phiếu thu. Bạn có muốn hủy kèm
                phiếu thu không?
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelPayments"
                    checked={cancelPayments === true}
                    onChange={() => setCancelPayments(true)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      Có - Hủy kèm phiếu thu
                    </div>
                    <div className="text-sm text-gray-600">
                      Phiếu thu sẽ bị xóa và công nợ khách hàng sẽ được cấn trừ
                      lại
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="cancelPayments"
                    checked={cancelPayments === false}
                    onChange={() => setCancelPayments(false)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      Không - Giữ nguyên phiếu thu
                    </div>
                    <div className="text-sm text-gray-600">
                      Phiếu thu vẫn tồn tại, công nợ khách hàng không thay đổi
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {!hasPayments && (
            <p className="text-gray-600 mb-4">
              Đơn hàng này không có phiếu thu.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
            Đóng
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors">
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  );
}
