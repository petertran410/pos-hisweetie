"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import type { WarehouseReceipt } from "@/lib/api/internal-finance";
import { formatCurrency, formatNumberInput } from "@/lib/utils";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const confirmedTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const iconButton =
  "rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40";

/**
 * Kế toán kho xác nhận số tiền mặt thực nhận. Chưa xác nhận: ô nhập số tay
 * ("Xác nhận đúng số tiền" nằm trong menu Thao tác). Đã xác nhận: số tiền kèm
 * nhãn "Đúng số" / "Tự nhập", sửa hoặc bỏ xác nhận bằng nút nhỏ.
 */
export function WarehouseCashConfirmCell({
  row,
  open,
  editable,
  pending,
  onConfirm,
}: {
  row: WarehouseReceipt;
  /** Phiếu chưa lập, chưa hủy. */
  open: boolean;
  editable: boolean;
  pending: boolean;
  onConfirm: (mode: "MATCH" | "MANUAL" | "CLEAR", amount?: number) => void;
}) {
  const confirmed =
    row.confirmedAmount === null || row.confirmedAmount === undefined
      ? null
      : Number(row.confirmedAmount);
  const mode = confirmed === null ? null : row.confirmedMode || "MANUAL";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  if (pending)
    return (
      <div className="flex justify-end">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );

  // Đã xác nhận (hoặc không sửa được): chỉ hiện số + nhãn.
  if (confirmed !== null && !editing) {
    const who = [row.confirmer?.name, confirmedTime(row.confirmedAt)]
      .filter(Boolean)
      .join(" · ");
    return (
      <div className="flex items-center justify-end gap-1.5" title={who}>
        <div className="text-right">
          <div className="font-medium">{formatCurrency(confirmed)}</div>
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[10px] font-medium ${
              mode === "MATCH"
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}>
            {mode === "MATCH" && <Check className="h-3 w-3" />}
            {mode === "MATCH" ? "Đúng số" : "Tự nhập"}
          </span>
        </div>
        {editable && (
          <div className="flex flex-col">
            <button
              type="button"
              title="Sửa số xác nhận"
              onClick={() => {
                setText(mode === "MANUAL" ? String(Math.round(confirmed)) : "");
                setEditing(true);
              }}
              className={iconButton}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Bỏ xác nhận"
              onClick={() => onConfirm("CLEAR")}
              className={`${iconButton} hover:bg-red-50 hover:text-red-600`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!editable)
    return (
      <div className="text-right text-xs text-gray-400">
        {open ? "Chưa xác nhận" : "—"}
      </div>
    );

  const typed = digitsOnly(text);
  const commit = () => {
    setEditing(false);
    if (!typed) return;
    const amount = Number(typed);
    if (mode === "MANUAL" && amount === confirmed) return;
    onConfirm("MANUAL", amount);
    setText("");
  };

  return (
    <div className="flex justify-end">
      <input
        autoFocus={editing}
        inputMode="numeric"
        placeholder="Số thực nhận"
        value={formatNumberInput(text)}
        onChange={(event) => setText(digitsOnly(event.target.value))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          if (event.key === "Escape") {
            setText("");
            setEditing(false);
          }
        }}
        className="h-8 w-28 rounded-md border border-gray-200 px-2 text-right text-sm placeholder:text-gray-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

/** Chênh lệch số báo đơn với số kế toán kho xác nhận. */
export function WarehouseCashDifference({ row }: { row: WarehouseReceipt }) {
  if (row.difference === null || row.difference === undefined)
    return <span className="text-gray-300">—</span>;
  const difference = Number(row.difference);
  if (difference === 0)
    return <span className="text-xs text-green-700">Khớp</span>;
  return difference > 0 ? (
    <span className="whitespace-nowrap font-medium text-red-600">
      Thiếu {formatCurrency(difference)}
    </span>
  ) : (
    <span className="whitespace-nowrap font-medium text-amber-700">
      Dư {formatCurrency(-difference)}
    </span>
  );
}
