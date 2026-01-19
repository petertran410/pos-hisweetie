"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";

interface ProductionSidebarProps {
  selectedBranches: number[];
  selectedStatuses: number[];
  timeMode: "preset" | "custom";
  selectedPreset: string;
  fromDate: Date | null;
  toDate: Date | null;
  onBranchesChange: (branches: number[]) => void;
  onStatusesChange: (statuses: number[]) => void;
  onTimeModeChange: (mode: "preset" | "custom") => void;
  onPresetChange: (preset: string) => void;
  onDateRangeChange: (from: Date | null, to: Date | null) => void;
  onClearAll: () => void;
}

export function ProductionSidebar({
  selectedBranches,
  selectedStatuses,
  timeMode,
  selectedPreset,
  fromDate,
  toDate,
  onBranchesChange,
  onStatusesChange,
  onTimeModeChange,
  onPresetChange,
  onDateRangeChange,
  onClearAll,
}: ProductionSidebarProps) {
  const { data: branches } = useBranches();
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  const STATUS_OPTIONS = [
    { value: 1, label: "Phiếu tạm", color: "bg-gray-100 text-gray-600" },
    { value: 2, label: "Hoàn thành", color: "bg-green-100 text-green-600" },
    { value: 3, label: "Đã hủy", color: "bg-red-100 text-red-600" },
  ];

  const TIME_PRESETS = [
    { value: "today", label: "Hôm nay" },
    { value: "yesterday", label: "Hôm qua" },
    { value: "this_week", label: "Tuần này" },
    { value: "last_week", label: "Tuần trước" },
    { value: "this_month", label: "Tháng này" },
    { value: "last_month", label: "Tháng trước" },
    { value: "7_days", label: "7 ngày qua" },
    { value: "30_days", label: "30 ngày qua" },
  ];

  const applyTimePreset = (preset: string) => {
    const now = new Date();
    let from: Date, to: Date;

    switch (preset) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "yesterday":
        from = new Date(now.setDate(now.getDate() - 1));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59, 999);
        break;
      case "this_week":
        from = new Date(now.setDate(now.getDate() - now.getDay()));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case "last_week":
        from = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setDate(to.getDate() + 6);
        to.setHours(23, 59, 59, 999);
        break;
      case "this_month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date();
        break;
      case "last_month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "7_days":
        from = new Date(now.setDate(now.getDate() - 7));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case "30_days":
        from = new Date(now.setDate(now.getDate() - 30));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      default:
        return;
    }

    onPresetChange(preset);
    onDateRangeChange(from, to);
    setShowTimeDropdown(false);
  };

  const toggleBranch = (branchId: number) => {
    const newBranches = selectedBranches.includes(branchId)
      ? selectedBranches.filter((id) => id !== branchId)
      : [...selectedBranches, branchId];
    onBranchesChange(newBranches);
  };

  const toggleStatus = (status: number) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    onStatusesChange(newStatuses);
  };

  const hasActiveFilters =
    selectedBranches.length > 0 ||
    selectedStatuses.length > 0 ||
    fromDate ||
    toDate;

  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div>
        <label className="block text-sm font-medium mb-2">Chi nhánh</label>
        <div className="relative">
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="w-full px-3 py-2 border rounded bg-white text-left flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedBranches.length > 0
                ? `Đã chọn ${selectedBranches.length} chi nhánh`
                : "Chọn chi nhánh"}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showBranchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
              {branches?.map((branch) => (
                <label
                  key={branch.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(branch.id)}
                    onChange={() => toggleBranch(branch.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{branch.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedBranches.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedBranches.map((branchId) => {
              const branch = branches?.find((b) => b.id === branchId);
              return (
                <span
                  key={branchId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {branch?.name}
                  <button
                    onClick={() => toggleBranch(branchId)}
                    className="hover:bg-blue-200 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Thời gian <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <div className="relative">
            <button
              onClick={() => {
                onTimeModeChange("preset");
                setShowTimeDropdown(!showTimeDropdown);
              }}
              className={`w-full px-3 py-2 border rounded bg-white text-left flex items-center justify-between text-sm ${
                timeMode === "preset" ? "border-blue-500" : ""
              }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={timeMode === "preset"}
                  readOnly
                  className="cursor-pointer"
                />
                <span>
                  {TIME_PRESETS.find((p) => p.value === selectedPreset)
                    ?.label || "Tháng này"}
                </span>
              </div>
              {timeMode === "preset" && <ChevronDown className="w-4 h-4" />}
            </button>

            {showTimeDropdown && timeMode === "preset" && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                <div className="py-1">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                    Theo ngày
                  </div>
                  {TIME_PRESETS.slice(0, 2).map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => applyTimePreset(preset.value)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        selectedPreset === preset.value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}>
                      {preset.label}
                    </button>
                  ))}

                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                    Theo tuần
                  </div>
                  {TIME_PRESETS.slice(2, 4).map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => applyTimePreset(preset.value)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        selectedPreset === preset.value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}>
                      {preset.label}
                    </button>
                  ))}

                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                    Theo tháng
                  </div>
                  {TIME_PRESETS.slice(4, 6).map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => applyTimePreset(preset.value)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        selectedPreset === preset.value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}>
                      {preset.label}
                    </button>
                  ))}

                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                    Khác
                  </div>
                  {TIME_PRESETS.slice(6).map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => applyTimePreset(preset.value)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        selectedPreset === preset.value
                          ? "bg-blue-50 text-blue-600"
                          : ""
                      }`}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onTimeModeChange("custom")}
            className={`w-full px-3 py-2 border rounded bg-white text-left flex items-center gap-2 text-sm ${
              timeMode === "custom" ? "border-blue-500" : ""
            }`}>
            <input
              type="radio"
              checked={timeMode === "custom"}
              readOnly
              className="cursor-pointer"
            />
            <span>Tùy chỉnh</span>
          </button>

          {timeMode === "custom" && (
            <div className="space-y-2 pl-6">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={fromDate ? fromDate.toISOString().split("T")[0] : ""}
                  onChange={(e) =>
                    onDateRangeChange(new Date(e.target.value), toDate)
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={toDate ? toDate.toISOString().split("T")[0] : ""}
                  onChange={(e) =>
                    onDateRangeChange(fromDate, new Date(e.target.value))
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Trạng thái <span className="text-red-500">*</span>
        </label>

        {selectedStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedStatuses.map((status) => {
              const option = STATUS_OPTIONS.find((opt) => opt.value === status);
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${option?.color}`}>
                  {option?.label}
                  <button
                    onClick={() => toggleStatus(status)}
                    className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="w-full px-3 py-2 border rounded bg-white text-left text-sm text-gray-600">
            Chọn trạng thái
          </button>

          {showStatusDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(option.value)}
                    onChange={() => toggleStatus(option.value)}
                    className="rounded"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded">
          Xóa bộ lọc
        </button>
      )}
    </div>
  );
}
