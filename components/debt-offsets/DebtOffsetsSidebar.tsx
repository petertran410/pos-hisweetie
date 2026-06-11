"use client";

import { useState, useEffect, useRef } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { ChevronDown } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";

interface DebtOffsetsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

const TIME_PRESETS = [
  { label: "Hôm nay", value: "today" },
  { label: "Tuần này", value: "this_week" },
  { label: "Tháng này", value: "this_month" },
  { label: "Tháng trước", value: "last_month" },
  { label: "30 ngày qua", value: "last_30_days" },
];

const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "this_week":
      const sw = new Date(today);
      sw.setDate(today.getDate() - today.getDay());
      return { from: sw, to: now };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "last_30_days":
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    default:
      return { from: today, to: now };
  }
};

export function DebtOffsetsSidebar({
  onFiltersChange,
}: DebtOffsetsSidebarProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [branchIds, setBranchIds] = useState<number[]>(() =>
    selectedBranch ? [selectedBranch.id] : []
  );
  const [enableDate, setEnableDate] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const branchOptions = (branches || []).map((b: any) => ({
    value: String(b.id),
    label: b.name,
  }));

  // Sync chi nhánh từ header (chỉ khi đang bám đúng 1 chi nhánh hoặc rỗng)
  const isFirstBranchSyncRef = useRef(true);
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null
  );
  useEffect(() => {
    const cur = selectedBranch?.id ?? null;
    if (isFirstBranchSyncRef.current) {
      isFirstBranchSyncRef.current = false;
      lastSyncedBranchIdRef.current = cur;
      return;
    }
    if (cur !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = cur;
      setBranchIds((prev) => (prev.length <= 1 ? (cur ? [cur] : []) : prev));
    }
  }, [selectedBranch?.id]);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      // Chỉ emit filter chi nhánh và thời gian, KHÔNG hardcode refundType/status
      // Page sẽ tự thêm type-specific filters dựa theo tab active
      const filters: any = {};
      if (branchIds.length > 0) filters.branchIds = branchIds;
      if (enableDate) {
        const range = getDateRangeFromPreset(selectedPreset);
        filters.fromDate = range.from.toISOString();
        filters.toDate = range.to.toISOString();
      }
      onFiltersChange(filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [branchIds, enableDate, selectedPreset]);

  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Bộ lọc</h3>
        <button
          onClick={() => {
            setBranchIds(selectedBranch ? [selectedBranch.id] : []);
            setEnableDate(true);
            setSelectedPreset("this_month");
          }}
          className="text-sm text-brand hover:underline">
          Xóa lọc
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chi nhánh</label>
        <FilterMultiSelect
          options={branchOptions}
          values={branchIds.map(String)}
          onChange={(vals) => setBranchIds(vals.map(Number))}
          placeholder="Tất cả chi nhánh"
          searchPlaceholder="Tìm chi nhánh..."
          multiLabel={(n) => `${n} chi nhánh`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Thời gian</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={enableDate}
            onChange={(e) => setEnableDate(e.target.checked)}
          />
          <span className="text-sm">Lọc theo thời gian</span>
        </div>
        {enableDate && (
          <div className="relative">
            <button
              onClick={() => setShowPresetDropdown(!showPresetDropdown)}
              className="w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between">
              {TIME_PRESETS.find((p) => p.value === selectedPreset)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showPresetDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => {
                      setSelectedPreset(p.value);
                      setShowPresetDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
