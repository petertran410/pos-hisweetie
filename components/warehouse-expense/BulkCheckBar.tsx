"use client";

import { CheckCheck, Loader2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/** Thanh tick hàng loạt khi đã chọn phiếu: trên bảng (máy tính) hoặc ghim đáy (điện thoại). */
export function BulkCheckBar({
  count,
  amount,
  canManager,
  canAccountant,
  pending,
  onTick,
  onClear,
  floating = false,
}: {
  count: number;
  amount: number;
  canManager: boolean;
  canAccountant: boolean;
  pending: boolean;
  onTick: (role: "manager" | "accountant") => void;
  onClear: () => void;
  /** Điện thoại: ghim ở đáy màn hình. */
  floating?: boolean;
}) {
  const button =
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50";
  return (
    <div
      className={
        floating
          ? "fixed inset-x-0 bottom-0 z-40 border-t bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
          : "flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-brand-soft/60 px-4 py-2"
      }>
      <div
        className={`flex items-center gap-2 text-sm ${floating ? "mb-2 justify-between" : ""}`}>
        <span>
          Đã chọn <strong>{count}</strong> phiếu ·{" "}
          <strong className="text-red-600">{formatCurrency(amount)}</strong>
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-gray-500 hover:bg-white">
          <X className="h-3.5 w-3.5" />
          Bỏ chọn
        </button>
      </div>
      <div className={`flex gap-2 ${floating ? "" : ""}`}>
        {canManager && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onTick("manager")}
            className={`${button} ${floating ? "flex-1 py-3" : ""}`}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Tick Quản lý kho
          </button>
        )}
        {canAccountant && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onTick("accountant")}
            className={`${button} ${floating ? "flex-1 py-3" : ""}`}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Tick Kế toán kho
          </button>
        )}
      </div>
    </div>
  );
}
