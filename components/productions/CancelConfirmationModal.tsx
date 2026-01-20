"use client";

import { X } from "lucide-react";

interface CancelConfirmationModalProps {
  productionCode: string;
  productionStatus: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelConfirmationModal({
  productionCode,
  productionStatus,
  onConfirm,
  onClose,
}: CancelConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Xác nhận hủy phiếu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Bạn có chắc chắn muốn hủy phiếu sản xuất{" "}
                <span className="font-semibold text-gray-900">
                  {productionCode}
                </span>
                ?
              </p>
            </div>
          </div>

          {productionStatus === 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-2">
                <svg
                  className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">
                    Lưu ý quan trọng
                  </h4>
                  <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                    <li>
                      Tồn kho nguyên liệu sẽ được hoàn trả dựa trên tồn kho hiện
                      tại
                    </li>
                    <li>
                      Tồn kho thành phẩm sẽ bị trừ (có thể âm nếu không đủ)
                    </li>
                    <li>Hành động này không thể hoàn tác</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {productionStatus === 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Phiếu tạm sẽ được đánh dấu là đã hủy. Tồn kho không thay đổi.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Không, giữ lại
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
            Có, hủy phiếu
          </button>
        </div>
      </div>
    </div>
  );
}
