"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

export interface MoreAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Nút "⋯" cuối footer dòng chi tiết (hóa đơn, đặt hàng): gom các thao tác phụ
 * (báo đơn, kết thúc, đặt xe, in…). Mục false bị bỏ qua; không còn mục nào thì ẩn nút.
 */
export function MoreActionsMenu({ actions }: { actions: (MoreAction | false)[] }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const items = actions.filter((a): a is MoreAction => !!a);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!items.length) return null;
  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        title="Thêm thao tác"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
          open ? "border-brand bg-brand-soft text-gray-900" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        // Mở lên trên: footer nằm cuối dòng chi tiết, mở xuống dễ bị khung cuộn bảng cắt
        <div className="absolute right-0 bottom-full z-30 mb-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
          {items.map(({ label, icon: Icon, onClick, disabled }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
              <Icon className="h-4 w-4 shrink-0 text-gray-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
