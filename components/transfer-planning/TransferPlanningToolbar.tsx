"use client";

import React, { useState, useEffect } from "react";
import { Search, Download, FileSpreadsheet, AlertOctagon, PackageCheck, Boxes, ArrowRightLeft } from "lucide-react";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import type { TransferPlanningSummary } from "@/lib/types/transfer-planning";
import { formatNumber } from "@/lib/utils/transfer-planning-calc";

interface TransferPlanningToolbarProps {
  summary?: TransferPlanningSummary;
  searchValue: string;
  onSearchChange: (val: string) => void;
  columns: { key: string; label: string; visible: boolean }[];
  onToggleColumn: (key: string) => void;
  onExportExcel: () => void;
  isExporting?: boolean;
}

export function TransferPlanningToolbar({
  summary,
  searchValue,
  onSearchChange,
  columns,
  onToggleColumn,
  onExportExcel,
  isExporting = false,
}: TransferPlanningToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Debounce search
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchValue, onSearchChange]);

  return (
    <div className="p-4 border-b space-y-4 bg-white" style={{ borderColor: "var(--dt-border)" }}>
      {/* 1. Summary Cards Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tổng SKU */}
        <div className="p-3 rounded-lg border bg-gray-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Tổng SKU kế hoạch</div>
            <div className="text-lg font-bold text-gray-900 font-mono">
              {summary?.totalSku ?? 0}
            </div>
          </div>
        </div>

        {/* SKU Cần chuyển */}
        <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-primary font-semibold">SKU cần chuyển</div>
            <div className="text-lg font-bold text-primary font-mono">
              {summary?.needTransferSku ?? 0}
            </div>
          </div>
        </div>

        {/* SKU Cảnh báo */}
        <div className="p-3 rounded-lg border bg-rose-50 border-rose-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-rose-700 font-semibold">SKU cảnh báo (CHUYỂN GẤP / Cần chuyển)</div>
            <div className="text-lg font-bold text-rose-700 font-mono">
              {summary?.warningSku ?? 0}
            </div>
          </div>
        </div>

        {/* Tổng SL đề xuất */}
        <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-emerald-800 font-semibold">Tổng SL đề xuất chuyển</div>
            <div className="text-lg font-bold text-emerald-800 font-mono">
              {formatNumber(summary?.totalSuggestedQuantity ?? 0, 1)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Search & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm SKU hoặc tên sản phẩm..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-gray-900"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <ColumnToggle columns={columns} onToggle={onToggleColumn} label="Cột hiển thị" />

          <PermissionGate resource="transfer_planning" action="export">
            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{isExporting ? "Đang xuất..." : "Xuất file"}</span>
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
