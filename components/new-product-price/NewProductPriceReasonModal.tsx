"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquareWarning, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";

/** Modal nhập lý do (trả về, từ chối, kết thúc phiếu). */
export function NewProductPriceReasonModal({
  title,
  label,
  confirmText,
  danger = false,
  checkboxLabel,
  loading,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  confirmText: string;
  danger?: boolean;
  checkboxLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (reason: string, checked: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const ok = reason.trim().length > 0;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-lg max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-brand" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} <span className="text-red-500">*</span>
            </label>
            <textarea
              autoFocus
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          {checkboxLabel && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="accent-brand"
              />
              {checkboxLabel}
            </label>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={loading}
            disabled={!ok}
            onClick={() => onSubmit(reason.trim(), checked)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-brand hover:bg-brand-dark"
            }`}>
            {confirmText}
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
