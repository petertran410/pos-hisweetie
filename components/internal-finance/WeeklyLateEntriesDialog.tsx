"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import type { WeeklyLateEntries } from "@/lib/api/internal-finance";
import { displayDescription } from "@/lib/internal-finance/display";
import { formatDateOnly } from "@/lib/internal-finance/dates";
import { formatCurrency } from "@/lib/utils";

/**
 * Trước khi gửi Approval tuần: có phiếu đủ tick sau lần Tổng hợp gần nhất (chưa
 * nằm trong batch). Người gửi chọn vẫn tạo approval Lark, hoặc đóng để bấm
 * "Tổng hợp lại".
 */
export function WeeklyLateEntriesDialog({
  late,
  loading,
  onConfirm,
  onClose,
}: {
  late: WeeklyLateEntries;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={() => !loading && onClose()}>
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-lg bg-white"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Có {late.count} phiếu mới đủ tick sau lần Tổng hợp
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-auto p-5">
          <p className="text-sm text-gray-600">
            Các phiếu dưới đây đã được Quản lý kho và Kế toán kho tick nhưng
            chưa nằm trong batch, nên sẽ không có trong approval Lark này.
          </p>
          <div className="divide-y rounded-lg border">
            {late.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <Link
                    href={`/tai-chinh/phieu-chi-kho?Code=${encodeURIComponent(entry.code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-brand hover:underline">
                    {entry.code}
                  </Link>
                  <div className="truncate text-gray-700">
                    {displayDescription(entry.description) || "-"}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Ngày chi {formatDateOnly(entry.occurredAt)}
                  </div>
                </div>
                <div className="whitespace-nowrap font-semibold text-red-600">
                  {formatCurrency(entry.amount)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Tổng</span>
            <strong className="text-red-600">
              {formatCurrency(late.amount)}
            </strong>
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Muốn đưa các phiếu này vào batch: bấm <strong>Đóng</strong> rồi bấm{" "}
            <strong>Tổng hợp lại</strong>.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Đóng
          </button>
          <LoadingButton
            loading={loading}
            onClick={onConfirm}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
            Vẫn tạo approval Lark
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
