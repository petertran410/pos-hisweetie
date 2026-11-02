"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart2, Table2 } from "lucide-react";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import {
  useReportAccess,
  REPORT_VIEWTYPE_PERMISSION,
} from "@/lib/permissions/reportPermissions";
import {
  SupplierReportFilters,
  SupplierViewType,
} from "@/lib/api/reports";

export type SupplierMode = "chart" | "data";

interface Props {
  viewType: SupplierViewType;
  onViewTypeChange: (v: SupplierViewType) => void;
  mode: SupplierMode;
  onModeChange: (m: SupplierMode) => void;
  onFiltersChange: (filters: SupplierReportFilters) => void;
}

const VIEW_TYPES: { value: SupplierViewType; label: string }[] = [
  { value: "PurchaseBySupplier", label: "Nhập theo NCC" },
  { value: "PurchaseByProduct", label: "Nhập theo sản phẩm" },
  { value: "SupplierDebt", label: "Công nợ NCC" },
  { value: "SupplierReturn", label: "Trả hàng nhập" },
  { value: "SupplierInfo", label: "Thông tin NCC" },
];

export function SupplierReportSidebar({
  viewType,
  onViewTypeChange,
  mode,
  onModeChange,
  onFiltersChange,
}: Props) {
  const { data: branches } = useBranches();
  const { data: suppliersData } = useSuppliers({ pageSize: 1000 });
  const { has } = useReportAccess();

  const visibleViewTypes = useMemo(
    () =>
      VIEW_TYPES.filter((v) =>
        has(REPORT_VIEWTYPE_PERMISSION["nha-cung-cap"][v.value])
      ),
    [has]
  );

  useEffect(() => {
    if (
      visibleViewTypes.length > 0 &&
      !visibleViewTypes.some((v) => v.value === viewType)
    ) {
      onViewTypeChange(visibleViewTypes[0].value);
    }
  }, [visibleViewTypes, viewType, onViewTypeChange]);

  const [branchId, setBranchId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // Bộ chọn thời gian dùng chung (giống trang Hóa đơn), mặc định "Tháng này".
  const [timeRange, setTimeRange] = useState<TimeRangeState>({
    dateMode: "preset",
    selectedPreset: "this_month",
    fromDate: "",
    toDate: "",
  });

  const suppliers =
    (suppliersData as { data?: { id: number; name: string }[] })?.data || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: SupplierReportFilters = { viewType };
      if (branchId) f.branchId = parseInt(branchId);
      if (supplierId) f.supplierId = parseInt(supplierId);

      // "Toàn thời gian" → null → không lọc theo ngày.
      const range = rangeToIso(timeRange);
      if (range) {
        f.fromDate = range.from;
        f.toDate = range.to;
      }
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewType,
    branchId,
    supplierId,
    timeRange,
  ]);

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Nhà cung cấp</h2>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* ── Loại báo cáo ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Loại báo cáo
          </label>
          <div className="space-y-1">
            {visibleViewTypes.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => onViewTypeChange(v.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewType === v.value
                    ? "bg-brand text-white font-medium shadow-sm"
                    : "text-gray-700 hover:bg-brand-soft border border-gray-200"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chế độ hiển thị ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Hiển thị
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onModeChange("chart")}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm border transition-colors ${
                mode === "chart"
                  ? "border-brand bg-brand-soft text-brand-dark font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              <BarChart2 className="w-4 h-4" /> Biểu đồ
            </button>
            <button
              type="button"
              onClick={() => onModeChange("data")}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-sm border transition-colors ${
                mode === "data"
                  ? "border-brand bg-brand-soft text-brand-dark font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              <Table2 className="w-4 h-4" /> Dữ liệu
            </button>
          </div>
        </div>

        {/* ── Thời gian ── */}
        <TimeRangeFilter
          label="Thời gian"
          value={timeRange}
          onChange={setTimeRange}
        />

        {/* ── Chi nhánh ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Chi nhánh
          </label>
          <FilterSearchableSelect
            options={(branches || [])
              .filter((b: { isActive: boolean }) => b.isActive)
              .map((b: { id: number; name: string }) => ({
                value: String(b.id),
                label: b.name,
              }))}
            value={branchId}
            onChange={setBranchId}
            placeholder="Tất cả"
            searchPlaceholder="Tìm chi nhánh..."
          />
        </div>

        {/* ── Nhà cung cấp ── */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Nhà cung cấp
          </label>
          <FilterSearchableSelect
            options={suppliers.map((s) => ({
              value: String(s.id),
              label: s.name,
            }))}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="Tất cả"
            searchPlaceholder="Tìm nhà cung cấp..."
          />
        </div>
      </div>
    </aside>
  );
}
