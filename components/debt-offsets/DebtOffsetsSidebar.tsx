"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { ChevronDown } from "lucide-react";

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
        to: new Date(now.getFullYear(), now.getMonth(), 0),
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
  const [branchId, setBranchId] = useState("");
  const [enableDate, setEnableDate] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  useEffect(() => {
    if (selectedBranch) setBranchId(selectedBranch.id.toString());
  }, [selectedBranch]);

  useEffect(() => {
    const filters: any = { refundType: "debt_offsets", status: 4 };
    if (branchId) filters.branchId = parseInt(branchId);
    if (enableDate) {
      const range = getDateRangeFromPreset(selectedPreset);
      filters.fromDate = range.from.toISOString();
      filters.toDate = range.to.toISOString();
    }
    onFiltersChange(filters);
  }, [branchId, enableDate, selectedPreset]);

  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Bộ lọc</h3>
        <button
          onClick={() => {
            setBranchId("");
            setEnableDate(true);
            setSelectedPreset("this_month");
          }}
          className="text-sm text-blue-600 hover:underline">
          Xóa lọc
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chi nhánh</label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm text-gray-500">
          <option value="">Tất cả chi nhánh</option>
          {(branches || []).map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
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
