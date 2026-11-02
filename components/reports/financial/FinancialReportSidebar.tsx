"use client";

import { useState, useEffect } from "react";
import { BarChart2, Table2 } from "lucide-react";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCashFlowGroups } from "@/lib/hooks/useCashflowGroups";
import {
  FinancialReportFilters,
  FinancialViewType,
} from "@/lib/api/reports";

export type FinancialMode = "chart" | "data";

interface Props {
  viewType: FinancialViewType;
  onViewTypeChange: (v: FinancialViewType) => void;
  mode: FinancialMode;
  onModeChange: (m: FinancialMode) => void;
  onFiltersChange: (filters: FinancialReportFilters) => void;
}

const VIEW_TYPES: { value: FinancialViewType; label: string }[] = [
  { value: "CashByGroup", label: "Thu chi theo nhóm" },
  { value: "CashByTime", label: "Thu chi theo thời gian" },
  { value: "CashFlowSummary", label: "Sổ quỹ" },
  { value: "SalePerformance", label: "Hiệu quả kinh doanh" },
];

export function FinancialReportSidebar({
  viewType,
  onViewTypeChange,
  mode,
  onModeChange,
  onFiltersChange,
}: Props) {
  const { data: branches } = useBranches();
  const { data: groups } = useCashFlowGroups();

  const [branchId, setBranchId] = useState("");
  const [cashFlowGroupId, setCashFlowGroupId] = useState("");
  const [direction, setDirection] = useState("");

  // Bộ chọn thời gian dùng chung (giống trang Hóa đơn), mặc định "Tháng này".
  const [timeRange, setTimeRange] = useState<TimeRangeState>({
    dateMode: "preset",
    selectedPreset: "this_month",
    fromDate: "",
    toDate: "",
  });

  const groupList =
    (groups as { id: number; name: string }[] | undefined) || [];
  // Lọc nhóm/chiều chỉ áp dụng cho thu chi (không cho SalePerformance)
  const showCashFilters = viewType !== "SalePerformance";

  useEffect(() => {
    const timer = setTimeout(() => {
      const f: FinancialReportFilters = { viewType };
      if (branchId) f.branchId = parseInt(branchId);
      if (cashFlowGroupId && showCashFilters)
        f.cashFlowGroupId = parseInt(cashFlowGroupId);
      if (direction && showCashFilters)
        f.direction = direction as "receipt" | "payment";

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
    cashFlowGroupId,
    direction,
    showCashFilters,
    timeRange,
  ]);

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <h2 className="text-base font-semibold text-gray-800">Tài chính</h2>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Loại báo cáo
          </label>
          <div className="space-y-1">
            {VIEW_TYPES.map((v) => (
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

        <TimeRangeFilter
          label="Thời gian"
          value={timeRange}
          onChange={setTimeRange}
        />

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

        {showCashFilters && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Loại phiếu
              </label>
              <FilterSearchableSelect
                options={[
                  { value: "receipt", label: "Phiếu thu" },
                  { value: "payment", label: "Phiếu chi" },
                ]}
                value={direction}
                onChange={setDirection}
                placeholder="Tất cả"
                searchable={false}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Nhóm thu chi
              </label>
              <FilterSearchableSelect
                options={groupList.map((g) => ({
                  value: String(g.id),
                  label: g.name,
                }))}
                value={cashFlowGroupId}
                onChange={setCashFlowGroupId}
                placeholder="Tất cả"
                searchPlaceholder="Tìm nhóm thu chi..."
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
