"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { WeeklyBatch } from "@/lib/api/internal-finance";
import { useCancelWarehouseExpenseBatch } from "@/lib/hooks/useInternalFinance";
import { hasEndedApproval } from "@/lib/internal-finance/weekly-batch";

export function CancelWeeklyBatchDialog({
  batch,
  onClose,
  onCancelled,
}: {
  batch: Pick<WeeklyBatch, "id" | "code" | "approvalRequest">;
  onClose: () => void;
  onCancelled?: () => void;
}) {
  const cancel = useCancelWarehouseExpenseBatch();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Chỉ đóng hộp này, không để panel phía sau cũng đóng theo.
      event.stopImmediatePropagation();
      onClose();
    };
    // Bắt ở pha capture để chạy trước listener Esc của panel.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose]);

  const confirm = () =>
    cancel.mutate(batch.id, {
      onSuccess: () => {
        onCancelled?.();
        onClose();
      },
    });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
      onClick={(event) => event.stopPropagation()}>
      <div className="w-full max-w-md rounded-lg bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Xác nhận hủy batch tuần
          </h3>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm text-gray-600">
              Hủy batch{" "}
              <span className="font-semibold text-gray-900">{batch.code}</span>?
            </p>
          </div>
          <ul className="list-inside list-disc space-y-1 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            {hasEndedApproval(batch) && (
              <li>Approval Lark của batch này đã hủy/từ chối.</li>
            )}
            <li>
              Các phiếu chi trả về Phiếu chi kho, giữ nguyên tick Quản lý kho và
              Kế toán kho.
            </li>
            <li>Có thể sửa phiếu rồi tổng hợp tuần lại.</li>
          </ul>
        </div>
        <div className="flex justify-end gap-3 border-t bg-gray-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Không, giữ lại
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={cancel.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {cancel.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Có, hủy batch
          </button>
        </div>
      </div>
    </div>
  );
}
