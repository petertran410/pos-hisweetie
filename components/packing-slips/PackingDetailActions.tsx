"use client";

import {
  Pencil,
  Send,
  Trash2,
} from "lucide-react";

interface PackingDetailActionsProps {
  type: string;
  cancelledAt?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onResend?: () => void;
  onResendLark?: () => void;
  onResendLoadingLark?: () => void;
  mobile?: boolean;
}

export function PackingDetailActions({
  type,
  cancelledAt,
  onEdit,
  onDelete,
  onResend,
  onResendLark,
  onResendLoadingLark,
  mobile = false,
}: PackingDetailActionsProps) {
  if (cancelledAt) {
    return (
      <div
        className={`rounded-lg bg-red-50 text-red-600 text-sm font-medium ${
          mobile ? "w-full py-3 text-center" : "px-3 py-2"
        }`}>
        Phiếu đã hủy · {new Date(cancelledAt).toLocaleString("vi-VN")}
      </div>
    );
  }

  const buttonClass = mobile
    ? "flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5"
    : "px-3 py-2 rounded-lg text-sm inline-flex items-center gap-1.5";

  return (
    <div
      className={
        mobile
          ? "flex flex-col gap-2"
          : "flex flex-wrap items-center justify-end gap-2"
      }>
      {onResend && type === "giao-hang" && (
        <button
          type="button"
          onClick={() => {
            if (confirm("Gửi lại tin nhắn Zalo cho báo đơn này?")) onResend();
          }}
          className={`${buttonClass} border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100`}>
          <Send className="w-4 h-4" />
          Gửi Zalo
        </button>
      )}
      {onResendLark && type === "giao-hang" && (
        <button
          type="button"
          onClick={() => {
            if (
              confirm("Đồng bộ lại phiếu chi của báo đơn này lên Lark?")
            ) {
              onResendLark();
            }
          }}
          className={`${buttonClass} border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100`}>
          <Send className="w-4 h-4" />
          Gửi Lark
        </button>
      )}
      {onResendLoadingLark && type === "loading" && (
        <button
          type="button"
          onClick={() => {
            if (
              confirm("Gửi lại thông báo loading của phiếu này lên Lark?")
            ) {
              onResendLoadingLark();
            }
          }}
          className={`${buttonClass} border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100`}>
          <Send className="w-4 h-4" />
          Gửi Lark
        </button>
      )}
      <div className={mobile ? "flex gap-2" : "contents"}>
        <button
          type="button"
          onClick={() => {
            if (confirm("Bạn có chắc chắn muốn hủy phiếu này?")) onDelete();
          }}
          className={`${mobile ? "flex-1" : ""} ${buttonClass} border border-red-200 text-red-600 hover:bg-red-50`}>
          <Trash2 className="w-4 h-4" />
          Hủy phiếu
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={`${mobile ? "flex-[2]" : ""} ${buttonClass} bg-brand text-white hover:bg-brand-dark`}>
          <Pencil className="w-4 h-4" />
          Sửa
        </button>
      </div>
    </div>
  );
}
