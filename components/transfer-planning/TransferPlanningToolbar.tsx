"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  AlertOctagon,
  PackageCheck,
  Boxes,
  ArrowRightLeft,
  Plus,
} from "lucide-react";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import type { TransferPlanningSummary } from "@/lib/types/transfer-planning";
import { formatNumber } from "@/lib/utils/transfer-planning-calc";

interface TransferPlanningToolbarProps {
  summary?: TransferPlanningSummary;
  isError?: boolean;
  searchValue: string;
  onSearchChange: (val: string) => void;
  columns: { key: string; label: string; visible: boolean }[];
  onToggleColumn: (key: string) => void;
  onExportExcel: () => void;
  isExporting?: boolean;
  tempDraftCount: number;
  onQuickCreate: () => void;
}

export function TransferPlanningToolbar({
  summary,
  isError = false,
  searchValue,
  onSearchChange,
  columns,
  onToggleColumn,
  onExportExcel,
  isExporting = false,
  tempDraftCount,
  onQuickCreate,
}: TransferPlanningToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Khi lỗi tải dữ liệu, hiện "—" thay vì 0 — số 0 trông như một kết quả thật.
  const stat = (value: number | undefined, format?: (n: number) => string) => {
    if (isError) return "—";
    const n = value ?? 0;
    return format ? format(n) : n;
  };

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
    <div
      className="p-4 border-b space-y-4 bg-white"
      style={{ borderColor: "var(--dt-border)" }}
    >
      {/* 1. Summary Cards Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tổng SKU */}
        <div className="p-3 rounded-lg border bg-gray-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">
              Tổng SKU kế hoạch
            </div>
            <div className="text-lg font-bold text-gray-900 font-mono">
              {stat(summary?.totalSku)}
            </div>
          </div>
        </div>

        {/* SKU Cần chuyển */}
        <div className="p-3 rounded-lg border bg-primary/5 border-primary/20 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-primary font-semibold">
              SKU cần chuyển
            </div>
            <div className="text-lg font-bold text-primary font-mono">
              {stat(summary?.needTransferSku)}
            </div>
          </div>
        </div>

        {/* SKU Cảnh báo */}
        <div className="p-3 rounded-lg border bg-rose-50 border-rose-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-rose-700 font-semibold">
              SKU cảnh báo (CHUYỂN GẤP / Cần chuyển)
            </div>
            <div className="text-lg font-bold text-rose-700 font-mono">
              {stat(summary?.warningSku)}
            </div>
          </div>
        </div>

        {/* Tổng SL đề xuất */}
        <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-emerald-800 font-semibold">
              Tổng SL đề xuất chuyển
            </div>
            <div className="text-lg font-bold text-emerald-800 font-mono">
              {stat(summary?.totalSuggestedQuantity, (n) => formatNumber(n, 1))}
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
          <PermissionGate resource="transfers" action="create">
            <button
              type="button"
              onClick={onQuickCreate}
              disabled={tempDraftCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo đơn nhanh</span>
              {tempDraftCount > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 text-xs">
                  {tempDraftCount}
                </span>
              )}
            </button>
          </PermissionGate>
          <ColumnToggle
            columns={columns}
            onToggle={onToggleColumn}
            label="Cột hiển thị"
          />

          <PermissionGate resource="transfer_planning" action="export">
            <button
              type="button"
              onClick={onExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{isExporting ? "Đang xuất..." : "Xuất file"}</span>
            </button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
