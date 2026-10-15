"use client";

import type { FormEvent, ReactNode } from "react";
import { Loader2, X } from "lucide-react";

/**
 * Khung form tạo/sửa phiếu kho: điện thoại là bottom sheet (giống Báo đơn),
 * máy tính là hộp giữa màn hình. Đầu và chân form cố định, thân form tự cuộn;
 * chân form chừa khoảng an toàn đáy máy. Dùng cho cả modal trong trang lẫn
 * trang riêng /phieu-kho.
 */
export function FinanceFormSheet({
  title,
  subtitle,
  onClose,
  onSubmit,
  width = "sm:max-w-xl",
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Bề ngang trên máy tính, ví dụ "sm:max-w-2xl". */
  width?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <form
        onSubmit={onSubmit}
        className={`fin-sheet flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[calc(100vh-2rem)] sm:rounded-xl ${width}`}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
          {children}
        </div>
        <div className="shrink-0 border-t px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:py-4">
          {footer}
        </div>
      </form>
    </div>
  );
}

/** Nút Hủy + Lưu: điện thoại chia đôi bề ngang, máy tính nằm bên phải. */
export function FinanceFormActions({
  onCancel,
  submitLabel,
  pending,
  disabled,
  summary,
}: {
  onCancel: () => void;
  submitLabel: string;
  pending: boolean;
  disabled?: boolean;
  /** Thông tin nhỏ bên trái trên máy tính (ví dụ tổng tiền). */
  summary?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {summary ? (
        <span className="text-xs text-gray-500">{summary}</span>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border px-4 py-3 text-base text-gray-700 hover:bg-gray-50 sm:flex-none sm:py-2 sm:text-sm">
          Hủy
        </button>
        <button
          type="submit"
          disabled={pending || disabled}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-base font-medium text-white hover:bg-brand-dark disabled:opacity-50 sm:flex-none sm:py-2 sm:text-sm">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
