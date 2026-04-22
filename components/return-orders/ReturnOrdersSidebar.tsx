"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useBranchStore } from "@/lib/store/branch";
import { ChevronDown } from "lucide-react";

interface ReturnOrdersSidebarProps {
  onFiltersChange: (filters: any) => void;
}

const RETURN_STATUS_OPTIONS = [
  { value: 1, label: "Yêu cầu trả hàng", color: "bg-blue-100" },
  { value: 6, label: "Đang nhập hàng (tạm)", color: "bg-purple-100" },
  { value: 2, label: "Nhập hàng trả", color: "bg-yellow-100" },
  { value: 3, label: "Yêu cầu hoàn tiền", color: "bg-orange-100" },
  { value: 4, label: "Hoàn thành", color: "bg-green-100" },
  { value: 5, label: "Đã hủy", color: "bg-red-100" },
];

const TIME_PRESETS = [
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "Tuần này", value: "this_week" },
  { label: "Tháng này", value: "this_month" },
  { label: "Tháng trước", value: "last_month" },
  { label: "7 ngày qua", value: "last_7_days" },
  { label: "30 ngày qua", value: "last_30_days" },
];

const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday":
      const yesterday = new Date(today.getTime() - 86400000);
      return {
        from: yesterday,
        to: new Date(yesterday.getTime() + 86400000 - 1),
      };
    case "this_week":
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { from: startOfWeek, to: now };
    case "this_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfMonth, to: now };
    case "last_month":
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: lastMonthStart, to: lastMonthEnd };
    case "last_7_days":
      const last7Days = new Date(today.getTime() - 7 * 86400000);
      return { from: last7Days, to: now };
    case "last_30_days":
      const last30Days = new Date(today.getTime() - 30 * 86400000);
      return { from: last30Days, to: now };
    default:
      return { from: today, to: now };
  }
};

export function ReturnOrdersSidebar({
  onFiltersChange,
}: ReturnOrdersSidebarProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { data: users } = useUsersForFilter();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
  const [enableDate, setEnableDate] = useState(true);
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [creatorId, setCreatorId] = useState<string>("");
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  useEffect(() => {
    if (selectedBranch) {
      setSelectedBranchId(selectedBranch.id.toString());
    }
  }, [selectedBranch]);

  useEffect(() => {
    applyFilters();
  }, [
    selectedBranchId,
    selectedStatuses,
    enableDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    creatorId,
  ]);

  const applyFilters = () => {
    const newFilters: any = {};

    if (selectedBranchId) {
      newFilters.branchId = parseInt(selectedBranchId);
    }

    if (selectedStatuses.length > 0) {
      newFilters.status = selectedStatuses[0];
    }

    if (enableDate) {
      let dateRange: { from: Date; to: Date };
      if (dateMode === "preset") {
        dateRange = getDateRangeFromPreset(selectedPreset);
      } else {
        if (fromDate && toDate) {
          dateRange = { from: new Date(fromDate), to: new Date(toDate) };
        } else {
          dateRange = getDateRangeFromPreset("this_month");
        }
      }
      newFilters.fromDate = dateRange.from.toISOString();
      newFilters.toDate = dateRange.to.toISOString();
    }

    if (creatorId) {
      newFilters.createdBy = parseInt(creatorId);
    }

    onFiltersChange(newFilters);
  };

  const toggleStatus = (status: number) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses([status]);
    }
  };

  const clearAllFilters = () => {
    setSelectedBranchId("");
    setSelectedStatuses([]);
    setEnableDate(true);
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    setCreatorId("");
  };

  const getPresetLabel = (value: string) => {
    return TIME_PRESETS.find((p) => p.value === value)?.label || value;
  };

  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Bộ lọc</h3>
        <button
          onClick={clearAllFilters}
          className="text-sm text-blue-600 hover:underline">
          Xóa lọc
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chi nhánh</label>
        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm text-gray-500">
          <option value="">Tất cả chi nhánh</option>
          {(branches || []).map((branch: any) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
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
          <>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setDateMode("preset")}
                className={`px-3 py-1 text-xs rounded ${dateMode === "preset" ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>
                Nhanh
              </button>
              <button
                onClick={() => setDateMode("custom")}
                className={`px-3 py-1 text-xs rounded ${dateMode === "custom" ? "bg-blue-100 text-blue-700" : "bg-gray-100"}`}>
                Tùy chọn
              </button>
            </div>
            {dateMode === "preset" ? (
              <div className="relative">
                <button
                  onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                  className="w-full px-3 py-2 border rounded-lg text-sm flex items-center justify-between">
                  {getPresetLabel(selectedPreset)}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showPresetDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                    {TIME_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setSelectedPreset(preset.value);
                          setShowPresetDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Trạng thái</label>
        <div className="space-y-2">
          {RETURN_STATUS_OPTIONS.map((status) => (
            <label
              key={status.value}
              className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className="cursor-pointer"
              />
              <span className="text-sm">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Người tạo</label>
        <select
          value={creatorId}
          onChange={(e) => setCreatorId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm text-gray-500">
          <option value="">Chọn người tạo</option>
          {(users || []).map((user: any) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
