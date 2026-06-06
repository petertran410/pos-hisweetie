"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, X } from "lucide-react";

interface ColumnToggleProps {
  columns: { key: string; label: string; visible: boolean }[];
  onToggle: (key: string) => void;
  /** Nhãn nút. Mặc định "Cột hiển thị". */
  label?: string;
}

/**
 * Nút + dropdown ẩn/hiện cột dùng chung cho mọi bảng.
 * - Dropdown thả xuống ngay dưới nút.
 * - Đóng khi click ra ngoài hoặc bấm nút ✕.
 * - Tự chuyển sang lưới 2 cột khi danh sách > 10 cột.
 */
export function ColumnToggle({
  columns,
  onToggle,
  label = "Cột hiển thị",
}: ColumnToggleProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const twoColumns = columns.length > 10;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
        <Settings className="w-4 h-4" />
        {label}
      </button>
      {open && (
        <div
          className={`absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 max-h-96 overflow-y-auto ${
            twoColumns ? "w-[420px]" : "w-64"
          }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-gray-700">
              Cột hiển thị
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className={twoColumns ? "grid grid-cols-2 gap-x-2" : ""}>
            {columns.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggle(col.key)}
                  className="cursor-pointer rounded"
                />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
