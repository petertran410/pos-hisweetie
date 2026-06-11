"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Download, ChevronDown } from "lucide-react";

interface ExportMenuProps {
  // Xuất bảng tổng hợp đang xem
  onExportOverview: () => Promise<void> | void;
  // Xuất toàn bộ chứng từ chi tiết (nếu view có tầng drilldown). Bỏ trống → chỉ 1 nút.
  onExportDetail?: () => Promise<void> | void;
  disabled?: boolean;
}

export function ExportMenu({
  onExportOverview,
  onExportDetail,
  disabled,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const run = async (fn: () => Promise<void> | void) => {
    setOpen(false);
    setExporting(true);
    try {
      await fn();
    } finally {
      setExporting(false);
    }
  };

  const btnClass =
    "flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  // Không có drilldown → 1 nút đơn
  if (!onExportDetail) {
    return (
      <button
        onClick={() => run(onExportOverview)}
        disabled={disabled || exporting}
        className={btnClass}>
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Xuất Excel
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || exporting}
        className={btnClass}>
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Xuất Excel
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={() => run(onExportOverview)}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors">
            Xuất tổng quan
          </button>
          <button
            onClick={() => run(onExportDetail)}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors border-t border-gray-100">
            Xuất chi tiết
          </button>
        </div>
      )}
    </div>
  );
}
