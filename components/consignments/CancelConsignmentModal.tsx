"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface CancelConsignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  consignmentCode: string;
  /** Phiếu đã xử lý kho (>= PACKED) — hủy sẽ hoàn kho. */
  willRestoreStock?: boolean;
}

export function CancelConsignmentModal({
  isOpen,
  onClose,
  onConfirm,
  consignmentCode,
  willRestoreStock,
}: CancelConsignmentModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Xác nhận hủy phiếu ký gửi</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Bạn có chắc chắn muốn hủy phiếu ký gửi{" "}
            <span className="font-semibold">{consignmentCode}</span>?
          </p>

          {willRestoreStock && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                Phiếu đã xử lý kho — hủy phiếu sẽ <b>hoàn lại tồn kho</b> đã trừ.
              </p>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lý do hủy (tuỳ chọn)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
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
    </div>,
    document.body
  );
}
