"use client";

import { ReactNode } from "react";
import { X } from "lucide-react";

export const INPUT_CLASS =
  "w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand disabled:bg-gray-100";

export const DATE_CLASS =
  "w-full flex items-center justify-between border border-gray-300 rounded px-2 py-1.5 text-sm text-left hover:border-gray-400";

const todayStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const today = todayStr;

/**
 * Ghép ngày người dùng chọn (YYYY-MM-DD) với giờ hiện tại → ISO. Form chỉ
 * chọn ngày, nhưng thẻ kho sắp theo thời điểm; nếu gửi ngày trần (00:00 UTC)
 * thì chứng từ hôm nay sẽ đứng trước các giao dịch đã phát sinh trong ngày.
 */
export function dateInputToIso(value: string): string {
  const now = new Date();
  if (!value) return now.toISOString();
  const [y, m, d] = value.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    d,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ).toISOString();
}

export function ModalShell({
  title,
  onClose,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-lg w-full ${maxWidth} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50 rounded-b-lg">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export const BTN_PRIMARY =
  "px-4 py-2 text-sm font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors disabled:opacity-50";
export const BTN_SECONDARY =
  "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors";
