"use client";

import { LayoutList, Table2 } from "lucide-react";
import type { ViewMode } from "@/lib/types/purchasing-planning";

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** Chuyển đổi giữa xem dạng danh sách và bảng tổng hợp */
export function ViewModeToggle({ value, onChange }: Props) {
  const base =
    "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors";

  return (
    <div
      className="flex items-center gap-0.5 rounded border p-0.5"
      style={{ borderColor: "var(--dt-border)" }}>
      <button
        type="button"
        onClick={() => onChange("list")}
        title="Xem dạng danh sách — đọc kỹ từng sản phẩm"
        className={`${base} ${
          value === "list"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}>
        <LayoutList className="h-3.5 w-3.5" />
        Danh sách
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        title="Xem dạng bảng — so sánh nhanh nhiều sản phẩm"
        className={`${base} ${
          value === "table"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:bg-gray-100"
        }`}>
        <Table2 className="h-3.5 w-3.5" />
        Bảng
      </button>
    </div>
  );
}
