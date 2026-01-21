"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsers } from "@/lib/hooks/useUsers";
import { ChevronDown } from "lucide-react";

interface DestructionsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

const STATUS_OPTIONS = [
  { value: 1, label: "Phiếu tạm", color: "bg-gray-100" },
  { value: 2, label: "Hoàn thành", color: "bg-green-100" },
  { value: 4, label: "Đã hủy", color: "bg-red-100" },
];

const TIME_PRESETS = [
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "Tuần này", value: "this_week" },
  { label: "Tuần trước", value: "last_week" },
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
    case "last_week":
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      return { from: lastWeekStart, to: lastWeekEnd };
    case "this_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfMonth, to: now };
    case "last_month":
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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

export function DestructionsSidebar({
  onFiltersChange,
}: DestructionsSidebarProps) {
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([1, 2]);
  const [enableDestructionDate, setEnableDestructionDate] = useState(true);
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [creatorId, setCreatorId] = useState("");

  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const { data: branchesData } = useBranches();
  const { data: usersData } = useUsers();

  const branches = branchesData || [];
  const users = usersData || [];

  useEffect(() => {
    applyFilters();
  }, [
    selectedBranches,
    selectedStatuses,
    enableDestructionDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    creatorId,
  ]);

  const applyFilters = () => {
    const filters: any = {};

    if (selectedBranches.length > 0) {
      filters.branchIds = selectedBranches;
    }

    if (selectedStatuses.length > 0) {
      filters.status = selectedStatuses;
    }

    if (enableDestructionDate) {
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

      filters.fromDestructionDate = dateRange.from.toISOString();
      filters.toDestructionDate = dateRange.to.toISOString();
    }

    if (creatorId) {
      filters.createdById = parseInt(creatorId);
    }

    onFiltersChange(filters);
  };

  const toggleBranch = (branchId: number) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId)
        ? prev.filter((id) => id !== branchId)
        : [...prev, branchId]
    );
  };

  const toggleStatus = (status: number) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const clearAllFilters = () => {
    setSelectedBranches([]);
    setSelectedStatuses([1, 2]);
    setEnableDestructionDate(true);
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    setCreatorId("");
  };

  const hasActiveFilters =
    selectedBranches.length > 0 ||
    selectedStatuses.length !== 2 ||
    creatorId ||
    dateMode === "custom";

  return (
    <aside className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bộ lọc</h2>
        <button
          onClick={clearAllFilters}
          className="text-sm text-blue-600 hover:text-blue-700">
          Xóa tất cả
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chi nhánh</label>
        <div className="space-y-2">
          {branches.map((branch) => (
            <label
              key={branch.id}
              className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedBranches.includes(branch.id)}
                onChange={() => toggleBranch(branch.id)}
                className="cursor-pointer"
              />
              <span className="text-sm">{branch.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Trạng thái
        </label>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((status) => (
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
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableDestructionDate}
            onChange={(e) => setEnableDestructionDate(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700">
            Thời gian xuất hủy
          </span>
        </label>

        {enableDestructionDate && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setDateMode("preset")}
                className={`flex-1 px-3 py-2 text-sm rounded ${
                  dateMode === "preset"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100"
                }`}>
                Tùy chọn
              </button>
              <button
                onClick={() => setDateMode("custom")}
                className={`flex-1 px-3 py-2 text-sm rounded ${
                  dateMode === "custom"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100"
                }`}>
                Tùy chỉnh
              </button>
            </div>

            {dateMode === "preset" ? (
              <div className="relative">
                <button
                  onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                  className="w-full px-3 py-2 border rounded flex items-center justify-between text-sm">
                  <span>
                    {
                      TIME_PRESETS.find((p) => p.value === selectedPreset)
                        ?.label
                    }
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showPresetDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
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
                  className="w-full px-3 py-2 border rounded text-sm"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Người tạo
        </label>
        <select
          value={creatorId}
          onChange={(e) => setCreatorId(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm">
          <option value="">Chọn người tạo</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded">
          Xóa bộ lọc
        </button>
      )}
    </aside>
  );
}
